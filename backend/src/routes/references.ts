// Reference data routes (accounts, categories, descriptions)
// Per CLAUDE.md: All routes scoped by user_id, category filtering by type

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as referencesController from '../controllers/references';
import * as transactionsController from '../controllers/transactions';
import {
  ApiResponse,
  Account,
  Category,
  Description,
  CategoryTotals,
  CreateAccountRequest,
  UpdateAccountRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateDescriptionRequest,
  UpdateDescriptionRequest
} from '../types/index';

const router = Router();

// ====== ACCOUNTS ======

// GET /api/users/:userId/accounts - Get all accounts for user
router.get(
  '/:userId/accounts',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    const accounts = await referencesController.getAccountsByUserId(userId);
    const response: ApiResponse<Account[]> = { data: accounts };
    res.json(response);
  })
);

// POST /api/users/:userId/accounts - Create a new account
router.post(
  '/:userId/accounts',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const createReq: CreateAccountRequest = req.body;

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    if (!createReq.name) {
      const response: ApiResponse<never> = { error: 'Account name is required' };
      res.status(400).json(response);
      return;
    }

    const account = await referencesController.createAccount(userId, createReq);
    const response: ApiResponse<Account> = { data: account };
    res.status(201).json(response);
  })
);

// PUT /api/users/:userId/accounts/:id - Update an account
router.put(
  '/:userId/accounts/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const accountId = parseInt(req.params.id, 10);
    const updateReq: UpdateAccountRequest = req.body;

    if (isNaN(userId) || isNaN(accountId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID or account ID' };
      res.status(400).json(response);
      return;
    }

    const account = await referencesController.updateAccount(userId, accountId, updateReq);

    if (!account) {
      const response: ApiResponse<never> = { error: 'Account not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Account> = { data: account };
    res.json(response);
  })
);

// DELETE /api/users/:userId/accounts/:id - Delete an account
router.delete(
  '/:userId/accounts/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const accountId = parseInt(req.params.id, 10);

    if (isNaN(userId) || isNaN(accountId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID or account ID' };
      res.status(400).json(response);
      return;
    }

    const deleted = await referencesController.deleteAccount(userId, accountId);

    if (!deleted) {
      const response: ApiResponse<never> = { error: 'Account not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<{ success: boolean }> = { data: { success: true } };
    res.json(response);
  })
);

// ====== CATEGORIES ======

// GET /api/users/:userId/categories - Get all categories (or filtered by type) or category totals (analytics)
router.get(
  '/:userId/categories',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const type = req.query.type as string | undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    // If year and month are provided, return category totals (analytics)
    if (year !== undefined && month !== undefined) {
      const categoryTotals = await transactionsController.getCategoryTotals(userId, year, month);
      const response: ApiResponse<CategoryTotals> = { data: categoryTotals };
      res.json(response);
      return;
    }

    // Otherwise, return category list (for reference/admin)
    let categories: Category[];

    if (type && ['expense', 'income', 'transfer'].includes(type)) {
      categories = await referencesController.getCategoriesByType(userId, type as 'expense' | 'income' | 'transfer');
    } else {
      categories = await referencesController.getCategoriesByUserId(userId);
    }

    const response: ApiResponse<Category[]> = { data: categories };
    res.json(response);
  })
);

// POST /api/users/:userId/categories - Create a new category
router.post(
  '/:userId/categories',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const createReq: CreateCategoryRequest = req.body;

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    if (!createReq.name) {
      const response: ApiResponse<never> = { error: 'Category name is required' };
      res.status(400).json(response);
      return;
    }

    const category = await referencesController.createCategory(userId, createReq);
    const response: ApiResponse<Category> = { data: category };
    res.status(201).json(response);
  })
);

// PUT /api/users/:userId/categories/:id - Update a category
router.put(
  '/:userId/categories/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const categoryId = parseInt(req.params.id, 10);
    const updateReq: UpdateCategoryRequest = req.body;

    if (isNaN(userId) || isNaN(categoryId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID or category ID' };
      res.status(400).json(response);
      return;
    }

    const category = await referencesController.updateCategory(userId, categoryId, updateReq);

    if (!category) {
      const response: ApiResponse<never> = { error: 'Category not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Category> = { data: category };
    res.json(response);
  })
);

// DELETE /api/users/:userId/categories/:id - Delete a category
router.delete(
  '/:userId/categories/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const categoryId = parseInt(req.params.id, 10);

    if (isNaN(userId) || isNaN(categoryId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID or category ID' };
      res.status(400).json(response);
      return;
    }

    const deleted = await referencesController.deleteCategory(userId, categoryId);

    if (!deleted) {
      const response: ApiResponse<never> = { error: 'Category not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<{ success: boolean }> = { data: { success: true } };
    res.json(response);
  })
);

// ====== DESCRIPTIONS ======

// GET /api/users/:userId/txn-descriptions - Get all descriptions (or filtered by common flag)
router.get(
  '/:userId/txn-descriptions',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const common = req.query.common === 'true';

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    let descriptions: Description[];

    if (common) {
      descriptions = await referencesController.getCommonDescriptionsByUserId(userId);
    } else {
      descriptions = await referencesController.getDescriptionsByUserId(userId);
    }

    const response: ApiResponse<Description[]> = { data: descriptions };
    res.json(response);
  })
);

// POST /api/users/:userId/txn-descriptions - Create a new description
router.post(
  '/:userId/txn-descriptions',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const createReq: CreateDescriptionRequest = req.body;

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    if (!createReq.description) {
      const response: ApiResponse<never> = { error: 'Description text is required' };
      res.status(400).json(response);
      return;
    }

    const description = await referencesController.createDescription(userId, createReq);
    const response: ApiResponse<Description> = { data: description };
    res.status(201).json(response);
  })
);

// PUT /api/users/:userId/txn-descriptions/:id - Update a description
router.put(
  '/:userId/txn-descriptions/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const descriptionId = parseInt(req.params.id, 10);
    const updateReq: UpdateDescriptionRequest = req.body;

    if (isNaN(userId) || isNaN(descriptionId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID or description ID' };
      res.status(400).json(response);
      return;
    }

    const description = await referencesController.updateDescription(userId, descriptionId, updateReq);

    if (!description) {
      const response: ApiResponse<never> = { error: 'Description not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<Description> = { data: description };
    res.json(response);
  })
);

// DELETE /api/users/:userId/txn-descriptions/:id - Delete a description
router.delete(
  '/:userId/txn-descriptions/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const descriptionId = parseInt(req.params.id, 10);

    if (isNaN(userId) || isNaN(descriptionId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID or description ID' };
      res.status(400).json(response);
      return;
    }

    const deleted = await referencesController.deleteDescription(userId, descriptionId);

    if (!deleted) {
      const response: ApiResponse<never> = { error: 'Description not found' };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse<{ success: boolean }> = { data: { success: true } };
    res.json(response);
  })
);

export default router;
