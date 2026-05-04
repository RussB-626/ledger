import fs from 'fs';
import path from 'path';
import { RowDataPacket } from 'mysql2/promise';
import pool from '../db';

export class BackupService {
  private backupDir = path.join(process.cwd(), 'backups');

  constructor() {
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(userId: number): Promise<{ success: boolean; filename?: string; error?: string }> {
    try {
      // Get user name for directory and filename
      const [userRows] = await pool.query<RowDataPacket[]>(
        'SELECT name FROM users WHERE id = ?',
        [userId]
      );

      if (userRows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      const userName = (userRows[0] as { name: string }).name;
      const userDir = path.join(this.backupDir, `user-${userName}`);
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${userName}-${timestamp}.sql`;
      const filepath = path.join(userDir, filename);

      const sqlDump = await this.generateBackupSql(userId);
      fs.writeFileSync(filepath, sqlDump);

      // Update last_backup_date
      await pool.query('UPDATE users SET last_backup_date = NOW() WHERE id = ?', [userId]);

      return { success: true, filename };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Backup creation failed for user ${userId}:`, message);
      return { success: false, error: message };
    }
  }

  async restoreBackup(
    backupFile: Buffer,
    targetUserId: number,
    mode: 'overwrite' | 'merge'
  ): Promise<{ success: boolean; error?: string }> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const sqlContent = backupFile.toString('utf-8');
      const originalUserId = await this.detectOriginalUserId(sqlContent);

      if (originalUserId === null) {
        await connection.rollback();
        return { success: false, error: 'Could not detect original user ID in backup' };
      }

      const remappedSql = await this.remapUserIdInSql(sqlContent, originalUserId, targetUserId);

      if (mode === 'overwrite') {
        // Delete existing data for target user
        await this.deleteUserDataBeforeRestore(connection, targetUserId);
      }

      // Execute remapped SQL (split into individual statements)
      const statements = remappedSql
        .split(';')
        .map(s => this.removeSqlComments(s.trim()))
        .filter(s => {
          if (s.length === 0) return false;
          // Skip INSERT INTO users statements
          return !s.toUpperCase().includes('INSERT INTO USERS');
        });

      for (const statement of statements) {
        // Remove trailing semicolon if present
        const cleanStatement = statement.replace(/;\s*$/, '');
        await connection.query(cleanStatement);
      }

      await connection.commit();
      return { success: true };
    } catch (error) {
      await connection.rollback();
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Restore failed for user ${targetUserId}:`, message);
      return { success: false, error: message };
    } finally {
      connection.release();
    }
  }

  async detectOriginalUserId(sqlContent: string): Promise<number | null> {
    // Look for INSERT statements with user_id
    const match = sqlContent.match(/INSERT INTO users[^;]*VALUES\s*\(\s*(\d+)\s*,/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }

    // Fallback: look for any user_id value in INSERT statements
    const fallbackMatch = sqlContent.match(/user_id[`"']?\s*[,)]\s*(\d+)/);
    if (fallbackMatch && fallbackMatch[1]) {
      return parseInt(fallbackMatch[1], 10);
    }

    return null;
  }

  async remapUserIdInSql(sqlContent: string, originalUserId: number, targetUserId: number): Promise<string> {
    if (originalUserId === targetUserId) {
      return sqlContent;
    }

    const statements = sqlContent.split('INSERT INTO ');

    const remapped = statements
      .map((segment, index) => {
        if (index === 0) return segment; // Before first INSERT

        const insertMatch = segment.match(/^(\w+)\s*\(([\w,\s]+)\)\s*VALUES\n([\s\S]*?)$/);
        if (!insertMatch) return `INSERT INTO ${segment}`;

        const [, tableName, columnList, values] = insertMatch;
        const columns = columnList.split(',').map(c => c.trim());
        const userIdIndex = columns.indexOf('user_id');

        if (userIdIndex === -1) {
          return `INSERT INTO ${segment}`;
        }

        // Replace user_id values at the correct column position
        const lines = values.split('\n');
        const updatedLines = lines.map(line => {
          // Match value tuples like (1, 2, 3) or (1, 2, 3),
          const tupleMatch = line.match(/^\s*\(([^)]+)\)(,)?(.*)$/);
          if (!tupleMatch) return line;

          const [, tupleContent, comma, rest] = tupleMatch;
          const vals = tupleContent.split(',').map(v => v.trim());

          // Replace user_id value at the correct position
          if (vals[userIdIndex] === String(originalUserId)) {
            vals[userIdIndex] = String(targetUserId);
          }

          return `(${vals.join(', ')})${comma || ''}${rest}`;
        });

        return `INSERT INTO ${tableName} (${columnList}) VALUES\n${updatedLines.join('\n')}`;
      })
      .join('');

    return remapped;
  }

  async cleanOldBackups(userId: number, retentionCount: number): Promise<void> {
    try {
      // Get user name for directory
      const [userRows] = await pool.query<RowDataPacket[]>(
        'SELECT name FROM users WHERE id = ?',
        [userId]
      );

      if (userRows.length === 0) {
        return;
      }

      const userName = (userRows[0] as { name: string }).name;
      const userDir = path.join(this.backupDir, `user-${userName}`);

      if (!fs.existsSync(userDir)) {
        return;
      }

      const files = fs.readdirSync(userDir)
        .filter(f => f.endsWith('.sql'))
        .map(f => ({
          name: f,
          path: path.join(userDir, f),
          time: fs.statSync(path.join(userDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // Delete files beyond retention count
      if (files.length > retentionCount) {
        const toDelete = files.slice(retentionCount);
        for (const file of toDelete) {
          fs.unlinkSync(file.path);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Cleanup failed for user ${userId}:`, message);
    }
  }

  private async generateBackupSql(userId: number): Promise<string> {
    const connection = await pool.getConnection();

    try {
      let sql = '';

      sql += `-- Backup for user ID ${userId}\n`;
      sql += `-- Generated: ${new Date().toISOString()}\n\n`;

      // Backup users table (user record only)
      const [userRows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      if (userRows.length > 0) {
        sql += this.generateInsertStatements('users', userRows);
        sql += '\n';
      }

      // Backup accounts
      const [accountRows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM accounts WHERE user_id = ? ORDER BY id',
        [userId]
      );

      if (accountRows.length > 0) {
        sql += this.generateInsertStatements('accounts', accountRows);
        sql += '\n';
      }

      // Backup categories
      const [categoryRows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM categories WHERE user_id = ? ORDER BY id',
        [userId]
      );

      if (categoryRows.length > 0) {
        sql += this.generateInsertStatements('categories', categoryRows);
        sql += '\n';
      }

      // Backup descriptions
      const [descriptionRows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM descriptions WHERE user_id = ? ORDER BY id',
        [userId]
      );

      if (descriptionRows.length > 0) {
        sql += this.generateInsertStatements('descriptions', descriptionRows);
        sql += '\n';
      }

      // Backup transactions
      const [transactionRows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM transactions WHERE user_id = ? ORDER BY id',
        [userId]
      );

      if (transactionRows.length > 0) {
        sql += this.generateInsertStatements('transactions', transactionRows);
        sql += '\n';
      }

      return sql;
    } finally {
      connection.release();
    }
  }

  private removeSqlComments(sql: string): string {
    // Remove SQL line comments (-- ...) and block comments (/* ... */)
    return sql
      .split('\n')
      .map(line => line.replace(/--.*$/, '').trim())
      .filter(line => line.length > 0)
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .trim();
  }

  private generateInsertStatements(tableName: string, rows: RowDataPacket[]): string {
    if (rows.length === 0) return '';

    const columns = Object.keys(rows[0]);
    const columnList = columns.join(', ');

    const values = rows.map(row => {
      const rowValues = columns.map(col => {
        const value = row[col];

        if (value === null) {
          return 'NULL';
        }

        if (typeof value === 'string') {
          return `'${value.replace(/'/g, "''")}'`;
        }

        if (typeof value === 'boolean') {
          return value ? '1' : '0';
        }

        if (value instanceof Date) {
          return `'${value.toISOString().split('T')[0]}'`;
        }

        return String(value);
      });

      return `(${rowValues.join(', ')})`;
    });

    return `INSERT INTO ${tableName} (${columnList}) VALUES\n${values.join(',\n')};\n`;
  }

  private async deleteUserDataBeforeRestore(
    connection: any,
    userId: number
  ): Promise<void> {
    // Delete in correct order due to foreign keys
    await connection.query('DELETE FROM transactions WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM descriptions WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM categories WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM accounts WHERE user_id = ?', [userId]);
  }
}

export const backupService = new BackupService();
