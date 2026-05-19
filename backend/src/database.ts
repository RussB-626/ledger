// Database initialization: Create schema if tables don't exist
// Automatically runs on backend startup

import fs from 'fs';
import path from 'path';
import pool from './db';

async function runMigrations(connection: any): Promise<void> {
  try {
    // Check if groups table exists
    const groupsTableResult = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'groups'`
    );

    const groupsTableRows = Array.isArray(groupsTableResult) ? groupsTableResult[0] : groupsTableResult;

    // If groups table doesn't exist, run migration
    if (!Array.isArray(groupsTableRows) || groupsTableRows.length === 0) {
      console.log('⚙  Running migration: Adding groups table and updating accounts...');

      // Create groups table
      await connection.query(`
        CREATE TABLE groups (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          user_id    INT NOT NULL,
          name       VARCHAR(100) NOT NULL,
          sort_order INT NOT NULL DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_user_group (user_id, name)
        )
      `);
      console.log('[Migration] Created groups table');

      // Add group_id and sort_order columns to accounts table
      await connection.query(`
        ALTER TABLE accounts ADD COLUMN group_id INT NOT NULL DEFAULT 1
      `);
      console.log('[Migration] Added group_id column to accounts table');

      await connection.query(`
        ALTER TABLE accounts ADD COLUMN sort_order INT NOT NULL DEFAULT 0
      `);
      console.log('[Migration] Added sort_order column to accounts table');

      // Create "Default Group" for each existing user
      await connection.query(`
        INSERT INTO groups (user_id, name, sort_order)
        SELECT DISTINCT user_id, 'Default Group', 1 FROM accounts
        ON DUPLICATE KEY UPDATE sort_order = 1
      `);
      console.log('[Migration] Created "Default Group" for each user');

      // Update accounts to reference their user's "Default Group"
      await connection.query(`
        UPDATE accounts a
        SET a.group_id = (
          SELECT g.id FROM groups g WHERE g.user_id = a.user_id AND g.name = 'Default Group'
        )
        WHERE a.group_id = 1
      `);
      console.log('[Migration] Updated accounts to reference their Default Group');

      // Add foreign key constraint for group_id
      await connection.query(`
        ALTER TABLE accounts ADD CONSTRAINT fk_accounts_group_id
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
      `);
      console.log('[Migration] Added foreign key constraint for group_id');

      // Assign sequential sort_order values to accounts within each group
      await connection.query(`
        UPDATE accounts a
        SET a.sort_order = (
          SELECT COUNT(*) FROM accounts a2
          WHERE a2.group_id = a.group_id AND a2.id <= a.id
        )
      `);
      console.log('[Migration] Assigned sort_order values to accounts');

      console.log('✓ Migration completed successfully');
    } else {
      console.log('✓ Groups table already exists, no migration needed');
    }
  } catch (error) {
    console.error('✗ Migration failed:', error);
    throw error;
  }
}

async function initializeDatabase(): Promise<void> {
  console.log('[Database] Starting initialization...');

  let connection;
  try {
    connection = await pool.getConnection();
    console.log('[Database] Connected to database, checking for existing tables...');

    // Check if tables already exist by querying information_schema
    const queryResult = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`
    );

    const rows = Array.isArray(queryResult) ? queryResult[0] : queryResult;
    console.log('[Database] Query result:', rows);

    if (Array.isArray(rows) && rows.length > 0) {
      console.log('✓ Database tables already exist, checking for migrations...');
      await runMigrations(connection);
      connection.release();
      return;
    }

    console.log('⚙  Database tables not found, initializing schema...');

    // Read schema.sql file
    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    console.log('[Database] Reading schema from:', schemaPath);

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    console.log('[Database] Schema file read successfully, size:', schemaSql.length, 'bytes');

    // Split schema into individual statements (remove SQL comments)
    const rawStatements = schemaSql.split(';');
    const statements = rawStatements
      .map(stmt => {
        // Remove line comments (-- comment)
        return stmt
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n')
          .trim();
      })
      .filter(stmt => stmt.length > 0);

    console.log('[Database] Found', statements.length, 'SQL statements to execute');

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`[Database] Executing statement ${i + 1}/${statements.length}...`);
        await connection.query(statement);
      }
    }

    console.log('✓ Database schema initialized successfully');
    connection.release();
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Error releasing connection:', releaseError);
      }
    }
    process.exit(1);
  }
}

export { initializeDatabase };
