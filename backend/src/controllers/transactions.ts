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
import { getGroupsByUserId } from './groups';

// ====== TRANSACTION RETRIEVAL ======

// Get transactions by year (defaults to current year), optionally filtered by group
export async function getTransactionsByYear(userId: number, year?: number, groupId?: number): Promise<Transaction[]> {
  const connection = await pool.getConnection();
  try {
    const targetYear = year || new Date().getFullYear();

    let query = `SELECT id, user_id, DATE_FORMAT(date, '%Y-%m-%d') as date, account, category, description_id, note, amount, type, pending, created_at
                 FROM transactions
                 WHERE user_id = ? AND YEAR(date) = ?`;
    const params: (number | string)[] = [userId, targetYear];

    if (groupId) {
      query += ` AND account IN (
                   SELECT a.name FROM accounts a WHERE a.user_id = ? AND a.group_id = ?
                 )`;
      params.push(userId, groupId);
    }

    query += ` ORDER BY date DESC`;

    const [rows] = await connection.query<RowDataPacket[]>(query, params);

    return await enrichTransactionsWithDescriptions(connection, rows as Transaction[]);
  } finally {
    connection.release();
  }
}

// Get all pending transactions (across all years), optionally filtered by group
export async function getPendingTransactions(userId: number, groupId?: number): Promise<Transaction[]> {
  const connection = await pool.getConnection();
  try {
    let query = `SELECT id, user_id, DATE_FORMAT(date, '%Y-%m-%d') as date, account, category, description_id, note, amount, type, pending, created_at
                 FROM transactions
                 WHERE user_id = ? AND pending = 1`;
    const params: (number | string)[] = [userId];

    if (groupId) {
      query += ` AND account IN (
                   SELECT a.name FROM accounts a WHERE a.user_id = ? AND a.group_id = ?
                 )`;
      params.push(userId, groupId);
    }

    query += ` ORDER BY date DESC`;

    const [rows] = await connection.query<RowDataPacket[]>(query, params);

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
      `SELECT id, user_id, DATE_FORMAT(date, '%Y-%m-%d') as date, account, category, description_id, note, amount, type, pending, created_at
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

        // Build transaction object directly (don't call getTransactionById - separate connection can't see uncommitted data)
        const transaction: Transaction = {
          id: result.insertId,
          user_id: userId,
          date: txnReq.date,
          account: txnReq.account,
          category: txnReq.category,
          description_id: descriptionId,
          description: txnReq.description,
          note: txnReq.note || null,
          amount: txnReq.amount,
          type: txnReq.type as 'D' | 'W' | 'TD' | 'TW',
          pending: txnReq.pending ?? false,
          created_at: new Date().toISOString()
        };

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
export async function getPageData(userId: number, groupId?: number): Promise<PageData> {
  const connection = await pool.getConnection();
  try {
    const currentYear = new Date().getFullYear();

    // Get groups
    const [groupRows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, name, sort_order FROM groups WHERE user_id = ? ORDER BY sort_order ASC',
      [userId]
    );

    // Get transactions for current year (optionally filtered by group)
    let txnQuery = `SELECT id, user_id, DATE_FORMAT(date, '%Y-%m-%d') as date, account, category, description_id, note, amount, type, pending, created_at
                    FROM transactions
                    WHERE user_id = ? AND YEAR(date) = ?`;
    const txnParams: (number | string)[] = [userId, currentYear];

    if (groupId) {
      txnQuery += ` AND account IN (SELECT a.name FROM accounts a WHERE a.user_id = ? AND a.group_id = ?)`;
      txnParams.push(userId, groupId);
    }

    txnQuery += ` ORDER BY date DESC`;

    const [txnRows] = await connection.query<RowDataPacket[]>(txnQuery, txnParams);

    const transactions = await enrichTransactionsWithDescriptions(connection, txnRows as Transaction[]);

    // Get all pending transactions (optionally filtered by group)
    let pendingQuery = `SELECT id, user_id, DATE_FORMAT(date, '%Y-%m-%d') as date, account, category, description_id, note, amount, type, pending, created_at
                        FROM transactions
                        WHERE user_id = ? AND pending = 1`;
    const pendingParams: (number | string)[] = [userId];

    if (groupId) {
      pendingQuery += ` AND account IN (SELECT a.name FROM accounts a WHERE a.user_id = ? AND a.group_id = ?)`;
      pendingParams.push(userId, groupId);
    }

    pendingQuery += ` ORDER BY date DESC`;

    const [pendingRows] = await connection.query<RowDataPacket[]>(pendingQuery, pendingParams);

    const pendingTransactions = await enrichTransactionsWithDescriptions(connection, pendingRows as Transaction[]);

    // Get all accounts (NOT filtered by group - needed for transaction modals to show all accounts)
    const accountQuery = 'SELECT id, user_id, group_id, name, sort_order FROM accounts WHERE user_id = ? ORDER BY group_id ASC, sort_order ASC';

    const [accountRows] = await connection.query<RowDataPacket[]>(accountQuery, [userId]);

    // Get categories
    const [categoryRows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, name, is_expense, is_income, is_transfer, is_ignored FROM categories WHERE user_id = ? ORDER BY name ASC',
      [userId]
    );

    // Get descriptions
    const [descRows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, description, is_monthly, is_yearly FROM descriptions WHERE user_id = ? ORDER BY description ASC',
      [userId]
    );

    // Get balances (optionally filtered by group)
    let balanceQuery = `SELECT
        t.account,
        SUM(CASE WHEN t.type = 'D' OR t.type = 'TD' THEN t.amount ELSE 0 END) as deposits,
        SUM(CASE WHEN t.type = 'W' OR t.type = 'TW' THEN t.amount ELSE 0 END) as withdrawals
       FROM transactions t`;

    if (groupId) {
      balanceQuery += ` JOIN accounts a ON t.account = a.name AND a.user_id = ?`;
    }

    balanceQuery += ` WHERE t.user_id = ?`;
    const balanceParams: number[] = [];

    if (groupId) {
      balanceParams.push(userId);
      balanceQuery += ` AND a.group_id = ?`;
      balanceParams.push(userId, groupId);
    } else {
      balanceParams.push(userId);
    }

    balanceQuery += ` GROUP BY t.account ORDER BY t.account ASC`;

    const [balanceRows] = await connection.query<RowDataPacket[]>(balanceQuery, balanceParams);

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
      groups: groupRows as any[],
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
        is_monthly: Boolean(row.is_monthly),
        is_yearly: Boolean(row.is_yearly)
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
  month: number,
  groupId?: number
): Promise<CategoryTotals> {
  const connection = await pool.getConnection();
  try {
    let query = `SELECT
        t.category,
        t.type,
        SUM(t.amount) as total
       FROM transactions t`;

    if (groupId !== undefined) {
      query += ` JOIN accounts a ON t.account = a.name AND a.user_id = ?
                WHERE a.group_id = ? AND t.user_id = ? AND YEAR(t.date) = ? AND MONTH(t.date) = ?`;
    } else {
      query += ` WHERE t.user_id = ? AND YEAR(t.date) = ? AND MONTH(t.date) = ?`;
    }

    query += ` AND NOT EXISTS (
         SELECT 1 FROM categories c
         WHERE c.user_id = ? AND c.name = t.category AND c.is_ignored = 1
       )
       GROUP BY t.category, t.type`;

    const params = groupId !== undefined
      ? [userId, groupId, userId, year, month, userId]
      : [userId, year, month, userId];

    const [rows] = await connection.query<RowDataPacket[]>(query, params);

    const expenses: Record<string, number> = {};
    const incomes: Record<string, number> = {};

    for (const row of rows) {
      const total = Number(row.total);
      const category = row.category as string;

      if (row.type === 'W') {
        expenses[category] = (expenses[category] || 0) + total;
      } else if (row.type === 'D') {
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
  month: number,
  groupId?: number
): Promise<MonthlyDifference> {
  const connection = await pool.getConnection();
  try {
    let query = `SELECT
        t.type,
        SUM(t.amount) as total
       FROM transactions t`;

    if (groupId !== undefined) {
      query += ` JOIN accounts a ON t.account = a.name AND a.user_id = ?
                WHERE a.group_id = ? AND t.user_id = ? AND YEAR(t.date) = ? AND MONTH(t.date) = ?`;
    } else {
      query += ` WHERE t.user_id = ? AND YEAR(t.date) = ? AND MONTH(t.date) = ?`;
    }

    query += ` AND NOT EXISTS (
         SELECT 1 FROM categories c
         WHERE c.user_id = ? AND c.name = t.category AND c.is_ignored = 1
       )
       GROUP BY t.type`;

    const params = groupId !== undefined
      ? [userId, groupId, userId, year, month, userId]
      : [userId, year, month, userId];

    const [rows] = await connection.query<RowDataPacket[]>(query, params);

    let income = 0;
    let expenses = 0;

    for (const row of rows) {
      const total = Number(row.total);
      if (row.type === 'D') {
        income += total;
      } else if (row.type === 'W') {
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

// ====== BULK UPLOAD ======

// Bulk upload transactions with auto-creation of missing references
export async function bulkUploadTransactions(
  userId: number,
  transactionsData: any[],
  groupId: number
): Promise<{
  accountsCreated: any[];
  categoriesCreated: any[];
  descriptionsCreated: any[];
  transactionsCreated: Transaction[];
  summary: {
    totalImported: number;
    accountsAdded: number;
    categoriesAdded: number;
    descriptionsAdded: number;
  };
}> {
  // Validate that the group exists and belongs to the user
  const groups = await getGroupsByUserId(userId);
  if (!groups.find(g => g.id === groupId)) {
    throw new Error('Invalid group selected.');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const accountsCreated: any[] = [];
    const categoriesCreated: any[] = [];
    const descriptionsCreated: any[] = [];
    const transactionsCreated: Transaction[] = [];

    try {
      // Extract unique accounts, categories, descriptions
      const uniqueAccounts = [...new Set(transactionsData.map(t => t.account))];
      const uniqueCategories = new Map<string, 'expense' | 'income' | 'transfer'>();
      const uniqueDescriptions = [...new Set(transactionsData.map(t => t.description))];

      transactionsData.forEach(t => {
        if (!uniqueCategories.has(t.category)) {
          uniqueCategories.set(t.category, t.categoryType);
        }
      });

      // Create missing accounts - fetch all at once, batch insert
      const [existingAccounts] = await connection.query<RowDataPacket[]>(
        'SELECT id, name FROM accounts WHERE user_id = ?',
        [userId]
      );

      const accountSet = new Set((existingAccounts as any[]).map(a => a.name));
      const accountsToCreate = [...uniqueAccounts].filter(name => !accountSet.has(name));

      // Get the highest sort_order for the group to use for new accounts
      const [sortOrderResult] = await connection.query<RowDataPacket[]>(
        'SELECT COALESCE(MAX(sort_order), 0) as maxSortOrder FROM accounts WHERE user_id = ? AND group_id = ?',
        [userId, groupId]
      );
      let nextSortOrder = ((sortOrderResult as any[])[0]?.maxSortOrder || 0) + 1;

      for (const accountName of accountsToCreate) {
        const [result] = await connection.query<ResultSetHeader>(
          'INSERT INTO accounts (user_id, group_id, name, sort_order) VALUES (?, ?, ?, ?)',
          [userId, groupId, accountName, nextSortOrder]
        );
        accountsCreated.push({ id: result.insertId, name: accountName });
        nextSortOrder++;
      }

      // Create/update missing categories - fetch all at once, batch updates
      const [existingCategories] = await connection.query<RowDataPacket[]>(
        'SELECT id, name, is_expense, is_income, is_transfer FROM categories WHERE user_id = ?',
        [userId]
      );

      const categoryMap = new Map((existingCategories as any[]).map(c => [c.name, c]));

      for (const [categoryName, categoryType] of uniqueCategories.entries()) {
        const existing = categoryMap.get(categoryName);
        const typeKey = `is_${categoryType}` as 'is_expense' | 'is_income' | 'is_transfer';

        if (!existing) {
          // Create new category
          const [result] = await connection.query<ResultSetHeader>(
            `INSERT INTO categories (user_id, name, is_expense, is_income, is_transfer, is_ignored)
             VALUES (?, ?, ?, ?, ?, 0)`,
            [
              userId,
              categoryName,
              categoryType === 'expense' ? 1 : 0,
              categoryType === 'income' ? 1 : 0,
              categoryType === 'transfer' ? 1 : 0
            ]
          );
          categoriesCreated.push({
            id: result.insertId,
            name: categoryName,
            is_expense: categoryType === 'expense',
            is_income: categoryType === 'income',
            is_transfer: categoryType === 'transfer'
          });
        } else if (!existing[typeKey]) {
          // Update existing category to add type
          await connection.query(
            `UPDATE categories SET ${typeKey} = 1 WHERE id = ?`,
            [existing.id]
          );
          categoriesCreated.push({
            id: existing.id,
            name: categoryName,
            is_expense: categoryType === 'expense' || existing.is_expense,
            is_income: categoryType === 'income' || existing.is_income,
            is_transfer: categoryType === 'transfer' || existing.is_transfer
          });
        }
      }

      // Create missing descriptions and build map before transaction
      const [existingDescriptions] = await connection.query<RowDataPacket[]>(
        'SELECT id, description FROM descriptions WHERE user_id = ?',
        [userId]
      );

      const descriptionMap = new Map<string, number>();
      const existingDescSet = new Set<string>();

      // Map existing descriptions
      for (const row of existingDescriptions as any[]) {
        descriptionMap.set(row.description, row.id);
        existingDescSet.add(row.description);
      }

      // Create missing descriptions
      for (const descriptionText of uniqueDescriptions) {
        if (!existingDescSet.has(descriptionText)) {
          const [result] = await connection.query<ResultSetHeader>(
            'INSERT INTO descriptions (user_id, description, is_monthly, is_yearly) VALUES (?, ?, 0, 0)',
            [userId, descriptionText]
          );
          const newId = (result as any).insertId;
          descriptionMap.set(descriptionText, newId);
          descriptionsCreated.push({ id: newId, description: descriptionText });
        }
      }

      // Create all transactions
      for (const txnData of transactionsData) {
        // Look up description ID from pre-built map (no database call in transaction)
        const descriptionId = descriptionMap.get(txnData.description);
        if (!descriptionId) {
          throw new Error(`Description "${txnData.description}" not found in mapping`);
        }

        const [result] = await connection.query<ResultSetHeader>(
          `INSERT INTO transactions (user_id, date, account, category, description_id, note, amount, type, pending)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            txnData.date,
            txnData.account,
            txnData.category,
            descriptionId,
            txnData.notes || null,
            txnData.amount,
            txnData.type,
            txnData.pending ? 1 : 0
          ]
        );

        // Build transaction object from data (don't call getTransactionById - separate connection can't see uncommitted data)
        const transaction: Transaction = {
          id: result.insertId,
          user_id: userId,
          date: txnData.date,
          account: txnData.account,
          category: txnData.category,
          description_id: descriptionId,
          description: txnData.description,
          note: txnData.notes || null,
          amount: txnData.amount,
          type: txnData.type as 'D' | 'W' | 'TD' | 'TW',
          pending: txnData.pending,
          created_at: new Date().toISOString()
        };

        transactionsCreated.push(transaction);
      }

      await connection.commit();

      return {
        accountsCreated,
        categoriesCreated,
        descriptionsCreated,
        transactionsCreated,
        summary: {
          totalImported: transactionsCreated.length,
          accountsAdded: accountsCreated.length,
          categoriesAdded: categoriesCreated.length,
          descriptionsAdded: descriptionsCreated.length
        }
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    }
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
