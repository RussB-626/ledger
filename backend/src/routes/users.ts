// User management routes
// Per CLAUDE.md: All routes use { data, error } response format

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as usersController from '../controllers/users';
import { ApiResponse, User, CreateUserRequest } from '../types/index';

const router = Router();

// GET /api/users - List all users
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const users = await usersController.getAllUsers();
    const response: ApiResponse<User[]> = { data: users };
    res.json(response);
  })
);

// POST /api/users - Create a new user
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const createReq: CreateUserRequest = req.body;

    if (!createReq.name) {
      const response: ApiResponse<never> = { error: 'User name is required' };
      res.status(400).json(response);
      return;
    }

    const user = await usersController.createUser(createReq);
    const response: ApiResponse<User> = { data: user };
    res.status(201).json(response);
  })
);

// DELETE /api/users/:id - Delete a user
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    await usersController.deleteUser(userId);
    const response: ApiResponse<{ success: boolean }> = { data: { success: true } };
    res.json(response);
  })
);

export default router;
