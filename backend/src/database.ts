// Database initialization: Create schema if tables don't exist
// Automatically runs on backend startup

import fs from 'fs';
import path from 'path';
import pool from './db';

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
      console.log('✓ Database tables already exist');
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
