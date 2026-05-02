// Transaction controllers with balance calculations, transfer pairs, and analytics
// Per CLAUDE.md: Backend pre-calculates ALL balances, transfer pairs created atomically

import { RowDataPacket, ResultSetHeader, Connection } from 'mysql2/promise';
import pool from '../db';
import {
  Transaction,
  PageData,
  CategoryTotals,
  MonthlyDifference,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  BatchCreateTransactionsRequest
} from '../types/index';
import { getOrCreateDescription } from './references';

// ====== TRANSACTION RETRIEVAL ======

// Get transactions by year (defaults to current year)
export async function getTransactionsByYear(userId: number, year?: number): Promise<Transaction[]> {
  const connection = await pool.getConnection();
  try {
    const targetYear = year || new Date().getFullYear();

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id, user_id, date, account, category, description_id, note, amount, type, pending, created_at
       FROM transactions
       WHERE user_id = ? AND YEAR(date) = ?
       ORDER BY date DESC`,
      [userId, targetYear]
    );

    return await enrichTransactionsWithDescriptions(connection, rows as Transaction[]);
  } finally {
    connection.release();
  }
}

// Get all pending transactions (across all years)
export async function getPendingTransactions(userId: number): Promise<Transaction[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id, user_id, date, account, category, description_id, note, amount, type, pending, created_at
       FROM transactions
       WHERE user_id = ? AND pending = 1
       ORDER BY date DESC`,
      [userId]
    );

    return await enrichTransactionsWithDescriptions(connection, rows as Transaction[]);
  } finally {
    connection.release();
  }
}

// Get transaction by ID (with user_id check for security)
export async function getTransactionById(userId: number, transactionId: number): Promise<Transaction | null> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id, user_id, date, account, category, description_id, note, amount, type, pending, created_at
       FROM transactions
       WHERE id = ? AND user_id = ?`,
      [transactionId, userId]
    );

    if (rows.length === 0) {
      return null;
    }

    const transactions = await enrichTransactionsWithDescriptions(connection, rows as Transaction[]);
    return transactions[0];
  } finally {
    connection.release();
  }
}

// ====== BALANCE CALCULATIONS ======

// Calculate balance for a single account
export async function calculateAccountBalance(userId: number, accountName: string): Promise<number> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT
        SUM(CASE WHEN type = 'D' OR type = 'TD' THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN type = 'W' OR type = 'TW' THEN amount ELSE 0 END) as withdrawals
       FROM transactions
       WHERE user_id = ? AND account = ?`,
      [userId, accountName]
    );

    const row = rows[0];
    const deposits = row.deposits ? Number(row.deposits) : 0;
    const withdrawals = row.withdrawals ? Number(row.withdrawals) : 0;

    return deposits - withdrawals;
  } finally {
    connection.release();
  }
}

// Calculate all account balances
export async function calculateAllBalances(userId: number): Promise<Record<string, number>> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT
        account,
        SUM(CASE WHEN type = 'D' OR type = 'TD' THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN type = 'W' OR type = 'TW' THEN amount ELSE 0 END) as withdrawals
       FROM transactions
       WHERE user_id = ?
       GROUP BY account
       ORDER BY account ASC`,
      [userId]
    );

    const balances: Record<string, number> = {};
    for (const row of rows) {
      const deposits = row.deposits ? Number(row.deposits) : 0;
      const withdrawals = row.withdrawals ? Number(row.withdrawals) : 0;
      balances[row.account] = deposits - withdrawals;
    }

    return balances;
  } finally {
    connection.release();
  }
}

// ====== TRANSACTION CREATION ======

// Create a single transaction
export async function createTransaction(
  userId: number,
  req: CreateTransactionRequest
): Promise<Transaction> {
  const connection = await pool.getConnection();
  try {
    // Get or create description
    const descriptionId = await getOrCreateDescription(userId, req.description);

    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        req.date,
        req.account,
        req.category,
        descriptionId,
        req.note || null,
        req.amount,
        req.type,
        req.pending ? 1 : 0
      ]
    );

    const transaction = await getTransactionById(userId, result.insertId);

    if (!transaction) {
      throw new Error('Failed to retrieve created transaction');
    }

    return transaction;
  } finally {
    connection.release();
  }
}

// Create multiple transactions atomically (for transfer pairs)
export async function createTransactionsBatch(
  userId: number,
  req: BatchCreateTransactionsRequest
): Promise<Transaction[]> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const createdTransactions: Transaction[] = [];

    try {
      for (const txnReq of req.transactions) {
        // Get or create description for this transaction
        const descriptionId = await getOrCreateDescription(userId, txnReq.description);

        const [result] = await connection.query<ResultSetHeader>(
          `INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            txnReq.date,
            txnReq.account,
            txnReq.category,
            descriptionId,
            txnReq.note || null,
            txnReq.amount,
            txnReq.type,
            txnReq.pending ? 1 : 0
          ]
        );

        const transaction = await getTransactionById(userId, result.insertId);
        if (!transaction) {
          throw new Error('Failed to retrieve created transaction');
        }

        createdTransactions.push(transaction);
      }

      await connection.commit();
      return createdTransactions;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } finally {
    connection.release();
  }
}

// ====== TRANSACTION UPDATES ======

// Update a transaction
export async function updateTransaction(
  userId: number,
  transactionId: number,
  req: UpdateTransactionRequest
): Promise<Transaction | null> {
  const connection = await pool.getConnection();
  try {
    // Build dynamic update query
    const updates: string[] = [];
    const values: (string | number | boolean | null)[] = [];

    if (req.date !== undefined) {
      updates.push('date = ?');
      values.push(req.date);
    }
    if (req.account !== undefined) {
      updates.push('account = ?');
      values.push(req.account);
    }
    if (req.category !== undefined) {
      updates.push('category = ?');
      values.push(req.category);
    }
    if (req.description !== undefined) {
      const descriptionId = await getOrCreateDescription(userId, req.description);
      updates.push('description_id = ?');
      values.push(descriptionId);
    }
    if (req.note !== undefined) {
      updates.push('note = ?');
      values.push(req.note || null);
    }
    if (req.amount !== undefined) {
      updates.push('amount = ?');
      values.push(req.amount);
    }
    if (req.type !== undefined) {
      updates.push('type = ?');
      values.push(req.type);
    }
    if (req.pending !== undefined) {
      updates.push('pending = ?');
      values.push(req.pending ? 1 : 0);
    }

    if (updates.length === 0) {
      return null;
    }

    values.push(transactionId, userId);

    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return await getTransactionById(userId, transactionId);
  } finally {
    connection.release();
  }
}

// ====== TRANSACTION DELETION ======

// Delete a transaction
export async function deleteTransaction(userId: number, transactionId: number): Promise<boolean> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.query<ResultSetHeader>(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [transactionId, userId]
    );

    return result.affectedRows > 0;
  } finally {
    connection.release();
  }
}

// ====== PAGE DATA (INITIAL LOAD) ======

// Get all data needed for initial page load (current year transactions + balances + references)
export async function getPageData(userId: number): Promise<PageData> {
  const connection = await pool.getConnection();
  try {
    const currentYear = new Date().getFullYear();

    // Get transactions for current year
    const [txnRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, user_id, date, account, category, description_id, note, amount, type, pending, created_at
       FROM transactions
       WHERE user_id = ? AND YEAR(date) = ?
       ORDER BY date DESC`,
      [userId, currentYear]
    );

    const transactions = await enrichTransactionsWithDescriptions(connection, txnRows as Transaction[]);

    // Get all pending transactions
    const [pendingRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, user_id, date, account, category, description_id, note, amount, type, pending, created_at
       FROM transactions
       WHERE user_id = ? AND pending = 1
       ORDER BY date DESC`,
      [userId]
    );

    const pendingTransactions = await enrichTransactionsWithDescriptions(connection, pendingRows as Transaction[]);

    // Get accounts
    const [accountRows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, name FROM accounts WHERE user_id = ? ORDER BY name ASC',
      [userId]
    );

    // Get categories
    const [categoryRows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, name, is_expense, is_income, is_transfer, is_ignored FROM categories WHERE user_id = ? ORDER BY name ASC',
      [userId]
    );

    // Get descriptions
    const [descRows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, description, is_common FROM descriptions WHERE user_id = ? ORDER BY description ASC',
      [userId]
    );

    // Get balances
    const [balanceRows] = await connection.query<RowDataPacket[]>(
      `SELECT
        account,
        SUM(CASE WHEN type = 'D' OR type = 'TD' THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN type = 'W' OR type = 'TW' THEN amount ELSE 0 END) as withdrawals
       FROM transactions
       WHERE user_id = ?
       GROUP BY account
       ORDER BY account ASC`,
      [userId]
    );

    const balances: Record<string, number> = {};
    for (const row of balanceRows) {
      const deposits = row.deposits ? Number(row.deposits) : 0;
      const withdrawals = row.withdrawals ? Number(row.withdrawals) : 0;
      balances[row.account] = deposits - withdrawals;
    }

    // Get years with transactions
    const [yearRows] = await connection.query<RowDataPacket[]>(
      'SELECT DISTINCT YEAR(date) as year FROM transactions WHERE user_id = ? ORDER BY year DESC',
      [userId]
    );

    const years = yearRows.map(row => row.year as number);

    // Get months with transactions in current year
    const [monthRows] = await connection.query<RowDataPacket[]>(
      `SELECT DISTINCT MONTH(date) as month FROM transactions WHERE user_id = ? AND YEAR(date) = ? ORDER BY month ASC`,
      [userId, currentYear]
    );

    const months = monthRows.map(row => row.month as number);

    return {
      transactions,
      pendingTransactions,
      accounts: accountRows as any[],
      categories: categoryRows.map(row => ({
        ...row,
        is_expense: Boolean(row.is_expense),
        is_income: Boolean(row.is_income),
        is_transfer: Boolean(row.is_transfer),
        is_ignored: Boolean(row.is_ignored)
      })) as any[],
      txnDescriptions: descRows.map(row => ({
        ...row,
        is_common: Boolean(row.is_common)
      })) as any[],
      balances,
      years,
      months
    };
  } finally {
    connection.release();
  }
}

// ====== ANALYTICS ======

// Get category totals for a specific month (excludes ignored categories)
export async function getCategoryTotals(
  userId: number,
  year: number,
  month: number
): Promise<CategoryTotals> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT
        t.category,
        t.type,
        SUM(t.amount) as total
       FROM transactions t
       WHERE t.user_id = ? AND YEAR(t.date) = ? AND MONTH(t.date) = ?
       AND NOT EXISTS (
         SELECT 1 FROM categories c
         WHERE c.user_id = ? AND c.name = t.category AND c.is_ignored = 1
       )
       GROUP BY t.category, t.type`,
      [userId, year, month, userId]
    );

    const expenses: Record<string, number> = {};
    const incomes: Record<string, number> = {};

    for (const row of rows) {
      const total = Number(row.total);
      const category = row.category as string;

      if (row.type === 'W' || row.type === 'TW') {
        expenses[category] = (expenses[category] || 0) + total;
      } else if (row.type === 'D' || row.type === 'TD') {
        incomes[category] = (incomes[category] || 0) + total;
      }
    }

    return { expenses, incomes };
  } finally {
    connection.release();
  }
}

// Get monthly difference (Income - Expenses, excludes ignored categories)
export async function getMonthlyDifference(
  userId: number,
  year: number,
  month: number
): Promise<MonthlyDifference> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT
        t.type,
        SUM(t.amount) as total
       FROM transactions t
       WHERE t.user_id = ? AND YEAR(t.date) = ? AND MONTH(t.date) = ?
       AND NOT EXISTS (
         SELECT 1 FROM categories c
         WHERE c.user_id = ? AND c.name = t.category AND c.is_ignored = 1
       )
       GROUP BY t.type`,
      [userId, year, month, userId]
    );

    let income = 0;
    let expenses = 0;

    for (const row of rows) {
      const total = Number(row.total);
      if (row.type === 'D' || row.type === 'TD') {
        income += total;
      } else if (row.type === 'W' || row.type === 'TW') {
        expenses += total;
      }
    }

    return {
      income,
      expenses,
      difference: income - expenses
    };
  } finally {
    connection.release();
  }
}

// ====== HELPER FUNCTIONS ======

// Enrich transactions with description text from descriptions table
async function enrichTransactionsWithDescriptions(
  connection: Connection,
  transactions: Transaction[]
): Promise<Transaction[]> {
  if (transactions.length === 0) {
    return [];
  }

  // Get unique description IDs
  const descriptionIds = [...new Set(transactions.map(t => t.description_id))];

  // Query descriptions
  const [descRows] = await connection.query<RowDataPacket[]>(
    'SELECT id, description FROM descriptions WHERE id IN (?)',
    [descriptionIds]
  );

  const descMap = new Map((descRows as any[]).map(row => [row.id, row.description]));

  // Enrich transactions
  return transactions.map(t => ({
    ...t,
    description: descMap.get(t.description_id) || '',
    pending: Boolean(t.pending)
  }));
}
