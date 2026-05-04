// User management controllers
// Per CLAUDE.md: All code is TypeScript with explicit types, all API responses use { data, error } format

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../db';
import { User, CreateUserRequest } from '../types/index';

// Get all users (for navbar switcher)
export async function getAllUsers(): Promise<User[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id, name, currency_symbol, decimal_places, thousand_separator, decimal_separator, currency_position, negative_format, negative_color, positive_color, theme, created_at FROM users ORDER BY name ASC'
    );
    return rows as User[];
  } finally {
    connection.release();
  }
}

// Get user by ID
export async function getUserById(userId: number): Promise<User | null> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id, name, currency_symbol, decimal_places, thousand_separator, decimal_separator, currency_position, negative_format, negative_color, positive_color, theme, backup_enabled, backup_frequency, backup_time, backup_day_of_week, backup_day_of_month, backup_count, last_backup_date, created_at FROM users WHERE id = ?',
      [userId]
    );
    if (rows.length === 0) {
      return null;
    }
    return rows[0] as User;
  } finally {
    connection.release();
  }
}

// Create a new user
export async function createUser(req: CreateUserRequest): Promise<User> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query<ResultSetHeader>(
      'INSERT INTO users (name) VALUES (?)',
      [req.name]
    );

    const userId = result.insertId;
    const user = await getUserById(userId);

    if (!user) {
      throw new Error('Failed to retrieve created user');
    }

    return user;
  } finally {
    connection.release();
  }
}

// Update user preferences
export async function updateUserPreferences(userId: number, preferences: any): Promise<User> {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      'UPDATE users SET currency_symbol = ?, decimal_places = ?, thousand_separator = ?, decimal_separator = ?, currency_position = ?, negative_format = ?, negative_color = ?, positive_color = ? WHERE id = ?',
      [
        preferences.currency_symbol,
        preferences.decimal_places,
        preferences.thousand_separator,
        preferences.decimal_separator,
        preferences.currency_position,
        preferences.negative_format,
        preferences.negative_color,
        preferences.positive_color,
        userId
      ]
    );

    const user = await getUserById(userId);

    if (!user) {
      throw new Error('Failed to retrieve updated user');
    }

    return user;
  } finally {
    connection.release();
  }
}

// Update user theme
export async function updateUserTheme(userId: number, theme: string): Promise<User> {
  const connection = await pool.getConnection();
  try {
    await connection.query(
      'UPDATE users SET theme = ? WHERE id = ?',
      [theme, userId]
    );

    const user = await getUserById(userId);

    if (!user) {
      throw new Error('Failed to retrieve updated user');
    }

    return user;
  } finally {
    connection.release();
  }
}

// Delete a user and all their associated data (cascade delete)
export async function deleteUser(userId: number): Promise<void> {
  const connection = await pool.getConnection();
  try {
    // Start transaction to ensure data consistency
    await connection.beginTransaction();

    try {
      // Delete transactions (which reference descriptions)
      await connection.query(
        'DELETE FROM transactions WHERE user_id = ?',
        [userId]
      );

      // Delete descriptions
      await connection.query(
        'DELETE FROM descriptions WHERE user_id = ?',
        [userId]
      );

      // Delete categories
      await connection.query(
        'DELETE FROM categories WHERE user_id = ?',
        [userId]
      );

      // Delete accounts
      await connection.query(
        'DELETE FROM accounts WHERE user_id = ?',
        [userId]
      );

      // Delete user
      await connection.query(
        'DELETE FROM users WHERE id = ?',
        [userId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } finally {
    connection.release();
  }
}
