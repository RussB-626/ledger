import { RowDataPacket } from 'mysql2/promise';
import { User, ApiResponse } from '../types/index';
import pool from '../db';
import { backupService } from '../services/backupService';
import { updateBackupSchedule } from '../scheduler/backupScheduler';

interface BackupSettings {
  backup_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  backup_time: string;
  backup_day_of_week?: number;
  backup_day_of_month?: number;
  backup_count: number;
}

export async function createBackup(userId: number): Promise<ApiResponse<{ filename?: string }>> {
  try {
    const result = await backupService.createBackup(userId);

    if (result.success) {
      // Clean up old backups based on retention settings
      const [userRows] = await pool.query<RowDataPacket[]>(
        'SELECT backup_count FROM users WHERE id = ?',
        [userId]
      );

      if (userRows.length > 0) {
        const backupCount = (userRows[0] as { backup_count: number }).backup_count;
        await backupService.cleanOldBackups(userId, backupCount);
      }

      return {
        data: { filename: result.filename }
      };
    } else {
      return {
        error: result.error || 'Failed to create backup'
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: `Backup creation failed: ${message}` };
  }
}

export async function restoreBackup(
  backupFile: Buffer,
  targetUserId: number,
  mode: 'overwrite' | 'merge'
): Promise<ApiResponse<{ restored: boolean }>> {
  try {
    const result = await backupService.restoreBackup(backupFile, targetUserId, mode);

    if (result.success) {
      return {
        data: { restored: true }
      };
    } else {
      return {
        error: result.error || 'Failed to restore backup'
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: `Backup restoration failed: ${message}` };
  }
}

export async function updateBackupSettings(userId: number, settings: BackupSettings): Promise<ApiResponse<User>> {
  const connection = await pool.getConnection();

  try {
    // Update user settings in database
    await connection.query(
      `UPDATE users SET
        backup_enabled = ?,
        backup_frequency = ?,
        backup_time = ?,
        backup_day_of_week = ?,
        backup_day_of_month = ?,
        backup_count = ?
       WHERE id = ?`,
      [
        settings.backup_enabled ? 1 : 0,
        settings.backup_frequency,
        settings.backup_time,
        settings.backup_day_of_week ?? null,
        settings.backup_day_of_month ?? null,
        settings.backup_count,
        userId
      ]
    );

    // Update the scheduler if backup is enabled
    if (settings.backup_enabled) {
      updateBackupSchedule(
        userId,
        settings.backup_frequency,
        settings.backup_time,
        settings.backup_day_of_week,
        settings.backup_day_of_month,
        settings.backup_count
      );
    }

    // Fetch and return updated user
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id, name, currency_symbol, decimal_places, thousand_separator, decimal_separator,
              currency_position, negative_format, negative_color, positive_color,
              backup_enabled, backup_frequency, backup_time, backup_day_of_week,
              backup_day_of_month, backup_count, last_backup_date, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return { error: 'User not found' };
    }

    return { data: rows[0] as User };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: `Failed to update backup settings: ${message}` };
  } finally {
    connection.release();
  }
}
