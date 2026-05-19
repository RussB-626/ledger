// Transaction routes
// Per CLAUDE.md: All routes scoped by user_id, pre-calculate balances on backend

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as transactionsController from '../controllers/transactions';
import {
  ApiResponse,
  Transaction,
  PageData,
  MonthlyDifference,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  BatchCreateTransactionsRequest
} from '../types/index';

const router = Router();

// GET /api/users/:userId/page-data - Initial load with current year transactions + balances
router.get(
  '/:userId/page-data',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string, 10) : undefined;

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    const pageData = await transactionsController.getPageData(userId, groupId);
    const response: ApiResponse<PageData> = { data: pageData };
    res.json(response);
  })
);

// GET /api/users/:userId/transactions - Get transactions by year
router.get(
  '/:userId/transactions',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string, 10) : undefined;

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    const transactions = await transactionsController.getTransactionsByYear(userId, year, groupId);
    const response: ApiResponse<Transaction[]> = { data: transactions };
    res.json(response);
  })
);

// GET /api/users/:userId/transactions/pending - Get all pending transactions
router.get(
  '/:userId/transactions/pending',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string, 10) : undefined;

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    const transactions = await transactionsController.getPendingTransactions(userId, groupId);
    const response: ApiResponse<Transaction[]> = { data: transactions };
    res.json(response);
  })
);

// POST /api/users/:userId/transactions - Create a single transaction
router.post(
  '/:userId/transactions',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const createReq: CreateTransactionRequest = req.body;

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    // Validate required fields
    if (!createReq.date || !createReq.account || !createReq.category || !createReq.description || createReq.amount === undefined || !createReq.type) {
      const response: ApiResponse<never> = { error: 'Missing required fields: date, account, category, description, amount, type' };
      res.status(400).json(response);
      return;
    }

    const transaction = await transactionsController.createTransaction(userId, createReq);
    const response: ApiResponse<Transaction> = { data: transaction };
    res.status(201).json(response);
  })
);

// POST /api/users/:userId/transactions/batch - Create multiple transactions atomically (for transfer pairs)
router.post(
  '/:userId/transactions/batch',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const batchReq: BatchCreateTransactionsRequest = req.body;

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    if (!Array.isArray(batchReq.transactions) || batchReq.transactions.length === 0) {
      const response: ApiResponse<never> = { error: 'transactions array is required and must not be empty' };
      res.status(400).json(response);
      return;
    }

    const transactions = await transactionsController.createTransactionsBatch(userId, batchReq);
    const response: ApiResponse<Transaction[]> = { data: transactions };
    res.status(201).json(response);
  })
);

// PUT /api/users/:userId/transactions/:id - Update a transaction
router.put(
  '/:userId/transactions/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const transactionId = parseInt(req.params.id, 10);
    const updateReq: UpdateTransactionRequest = req.body;

    if (isNaN(userId) || isNaN(transactionId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID or transaction ID' };
      res.status(400).json(response);
      return;
    }

    const transaction = await transactionsController.updateTransaction(userId, transactionId, updateReq);

    if (!transaction) {
      const response: ApiResponse<never> = { error: 'Transaction not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Transaction> = { data: transaction };
    res.json(response);
  })
);

// DELETE /api/users/:userId/transactions/:id - Delete a transaction
router.delete(
  '/:userId/transactions/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const transactionId = parseInt(req.params.id, 10);

    if (isNaN(userId) || isNaN(transactionId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID or transaction ID' };
      res.status(400).json(response);
      return;
    }

    const deleted = await transactionsController.deleteTransaction(userId, transactionId);

    if (!deleted) {
      const response: ApiResponse<never> = { error: 'Transaction not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<{ success: boolean }> = { data: { success: true } };
    res.json(response);
  })
);

// POST /api/users/:userId/transactions/bulk-upload - Bulk upload transactions with auto-creation of references
router.post(
  '/:userId/transactions/bulk-upload',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const { transactions: txnsToUpload, groupId } = req.body as { transactions?: any[]; groupId?: number };

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    if (!groupId || groupId < 1) {
      const response: ApiResponse<never> = { error: 'Valid groupId is required' };
      res.status(400).json(response);
      return;
    }

    if (!Array.isArray(txnsToUpload) || txnsToUpload.length === 0) {
      const response: ApiResponse<never> = { error: 'transactions array is required and must not be empty' };
      res.status(400).json(response);
      return;
    }

    // Call the bulk upload controller
    const result = await transactionsController.bulkUploadTransactions(userId, txnsToUpload, groupId);
    const response: ApiResponse<any> = { data: result };
    res.status(201).json(response);
  })
);

// GET /api/users/:userId/monthly-difference - Get monthly (Income - Expenses)
router.get(
  '/:userId/monthly-difference',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month as string, 10) : new Date().getMonth() + 1;
    const groupId = req.query.groupId ? parseInt(req.query.groupId as string, 10) : undefined;

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    const difference = await transactionsController.getMonthlyDifference(userId, year, month, groupId);
    const response: ApiResponse<MonthlyDifference> = { data: difference };
    res.json(response);
  })
);

export default router;
