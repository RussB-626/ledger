// MySQL connection pool with strict TypeScript typing
// Per CLAUDE.md: Strict TypeScript mode enabled, all code is TypeScript

import mysql from 'mysql2/promise';
import { DBConfig } from './types/index';

// Read database configuration from environment variables
const config: DBConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'ledger',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(config);

// Test connection on startup
pool.getConnection().then((connection) => {
  console.log('✓ Database connected successfully');
  connection.release();
}).catch((error: Error) => {
  console.error('✗ Database connection failed:', error.message);
  process.exit(1);
});

export default pool;
