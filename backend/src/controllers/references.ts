// Reference data controllers (accounts, categories, descriptions)
// Per CLAUDE.md: All data scoped by user_id, no cross-user data leakage

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../db';
import {
  Account,
  Category,
  Description,
  CreateAccountRequest,
  UpdateAccountRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateDescriptionRequest,
  UpdateDescriptionRequest
} from '../types/index';

// ====== ACCOUNTS ======

export async function getAccountsByUserId(userId: number): Promise<Account[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, name FROM accounts WHERE user_id = ? ORDER BY name ASC',
      [userId]
    );
    return rows as Account[];
  } finally {
    connection.release();
  }
}

export async function createAccount(userId: number, req: CreateAccountRequest): Promise<Account> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query<ResultSetHeader>(
      'INSERT INTO accounts (user_id, name) VALUES (?, ?)',
      [userId, req.name]
    );
    return {
      id: result.insertId,
      user_id: userId,
      name: req.name
    };
  } finally {
    connection.release();
  }
}

export async function updateAccount(
  userId: number,
  accountId: number,
  req: UpdateAccountRequest
): Promise<Account | null> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query<ResultSetHeader>(
      'UPDATE accounts SET name = ? WHERE id = ? AND user_id = ?',
      [req.name, accountId, userId]
    );

    if (result.affectedRows === 0) {
      return null;
    }

    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, name FROM accounts WHERE id = ?',
      [accountId]
    );

    return rows.length > 0 ? (rows[0] as Account) : null;
  } finally {
    connection.release();
  }
}

export async function deleteAccount(userId: number, accountId: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query<ResultSetHeader>(
      'DELETE FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    );
    return result.affectedRows > 0;
  } finally {
    connection.release();
  }
}

// ====== CATEGORIES ======

export async function getCategoriesByUserId(userId: number): Promise<Category[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, name, is_expense, is_income, is_transfer, is_ignored FROM categories WHERE user_id = ? ORDER BY name ASC',
      [userId]
    );
    return rows.map(row => ({
      ...row,
      is_expense: Boolean(row.is_expense),
      is_income: Boolean(row.is_income),
      is_transfer: Boolean(row.is_transfer),
      is_ignored: Boolean(row.is_ignored)
    })) as Category[];
  } finally {
    connection.release();
  }
}

// Get categories filtered by type (expense/income/transfer)
export async function getCategoriesByType(
  userId: number,
  type: 'expense' | 'income' | 'transfer'
): Promise<Category[]> {
  const connection = await pool.getConnection();
  try {
    const columnName = type === 'expense' ? 'is_expense' : type === 'income' ? 'is_income' : 'is_transfer';

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id, user_id, name, is_expense, is_income, is_transfer, is_ignored FROM categories WHERE user_id = ? AND ${columnName} = 1 ORDER BY name ASC`,
      [userId]
    );

    return rows.map(row => ({
      ...row,
      is_expense: Boolean(row.is_expense),
      is_income: Boolean(row.is_income),
      is_transfer: Boolean(row.is_transfer),
      is_ignored: Boolean(row.is_ignored)
    })) as Category[];
  } finally {
    connection.release();
  }
}

export async function createCategory(
  userId: number,
  req: CreateCategoryRequest
): Promise<Category> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query<ResultSetHeader>(
      'INSERT INTO categories (user_id, name, is_expense, is_income, is_transfer, is_ignored) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, req.name, req.is_expense ? 1 : 0, req.is_income ? 1 : 0, req.is_transfer ? 1 : 0, req.is_ignored ? 1 : 0]
    );

    return {
      id: result.insertId,
      user_id: userId,
      name: req.name,
      is_expense: req.is_expense,
      is_income: req.is_income,
      is_transfer: req.is_transfer,
      is_ignored: req.is_ignored ?? false
    };
  } finally {
    connection.release();
  }
}

export async function updateCategory(
  userId: number,
  categoryId: number,
  req: UpdateCategoryRequest
): Promise<Category | null> {
  const connection = await pool.getConnection();
  try {
    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (req.name !== undefined) {
      updates.push('name = ?');
      values.push(req.name);
    }
    if (req.is_expense !== undefined) {
      updates.push('is_expense = ?');
      values.push(req.is_expense ? 1 : 0);
    }
    if (req.is_income !== undefined) {
      updates.push('is_income = ?');
      values.push(req.is_income ? 1 : 0);
    }
    if (req.is_transfer !== undefined) {
      updates.push('is_transfer = ?');
      values.push(req.is_transfer ? 1 : 0);
    }
    if (req.is_ignored !== undefined) {
      updates.push('is_ignored = ?');
      values.push(req.is_ignored ? 1 : 0);
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(categoryId, userId);

    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return null;
    }

    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, name, is_expense, is_income, is_transfer, is_ignored FROM categories WHERE id = ?',
      [categoryId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      is_expense: Boolean(row.is_expense),
      is_income: Boolean(row.is_income),
      is_transfer: Boolean(row.is_transfer),
      is_ignored: Boolean(row.is_ignored)
    };
  } finally {
    connection.release();
  }
}

export async function deleteCategory(userId: number, categoryId: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query<ResultSetHeader>(
      'DELETE FROM categories WHERE id = ? AND user_id = ?',
      [categoryId, userId]
    );
    return result.affectedRows > 0;
  } finally {
    connection.release();
  }
}

// ====== DESCRIPTIONS ======

export async function getDescriptionsByUserId(userId: number): Promise<Description[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, description, is_common FROM descriptions WHERE user_id = ? ORDER BY description ASC',
      [userId]
    );
    return rows.map(row => ({
      ...row,
      is_common: Boolean(row.is_common)
    })) as Description[];
  } finally {
    connection.release();
  }
}

// Get only common descriptions
export async function getCommonDescriptionsByUserId(userId: number): Promise<Description[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, description, is_common FROM descriptions WHERE user_id = ? AND is_common = 1 ORDER BY description ASC',
      [userId]
    );
    return rows.map(row => ({
      ...row,
      is_common: Boolean(row.is_common)
    })) as Description[];
  } finally {
    connection.release();
  }
}

// Get or create description (for transaction creation)
export async function getOrCreateDescription(
  userId: number,
  descriptionText: string
): Promise<number> {
  const connection = await pool.getConnection();
  try {
    // Try to find existing description
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM descriptions WHERE user_id = ? AND description = ?',
      [userId, descriptionText]
    );

    if (rows.length > 0) {
      return rows[0].id as number;
    }

    // Create new description if not exists
    const [result] = await connection.query<ResultSetHeader>(
      'INSERT INTO descriptions (user_id, description, is_common) VALUES (?, ?, ?)',
      [userId, descriptionText, 0]
    );

    return result.insertId;
  } finally {
    connection.release();
  }
}

export async function createDescription(
  userId: number,
  req: CreateDescriptionRequest
): Promise<Description> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query<ResultSetHeader>(
      'INSERT INTO descriptions (user_id, description, is_common) VALUES (?, ?, ?)',
      [userId, req.description, req.is_common ? 1 : 0]
    );

    return {
      id: result.insertId,
      user_id: userId,
      description: req.description,
      is_common: req.is_common ?? false
    };
  } finally {
    connection.release();
  }
}

export async function updateDescription(
  userId: number,
  descriptionId: number,
  req: UpdateDescriptionRequest
): Promise<Description | null> {
  const connection = await pool.getConnection();
  try {
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (req.description !== undefined) {
      updates.push('description = ?');
      values.push(req.description);
    }
    if (req.is_common !== undefined) {
      updates.push('is_common = ?');
      values.push(req.is_common ? 1 : 0);
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(descriptionId, userId);

    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE descriptions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return null;
    }

    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, description, is_common FROM descriptions WHERE id = ?',
      [descriptionId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      description: row.description,
      is_common: Boolean(row.is_common)
    };
  } finally {
    connection.release();
  }
}

export async function deleteDescription(userId: number, descriptionId: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query<ResultSetHeader>(
      'DELETE FROM descriptions WHERE id = ? AND user_id = ?',
      [descriptionId, userId]
    );
    return result.affectedRows > 0;
  } finally {
    connection.release();
  }
}
