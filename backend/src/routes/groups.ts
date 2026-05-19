// Group management routes
// Per CLAUDE.md: All routes use { data, error } response format
// Groups are organizational containers for accounts, per-user

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as groupsController from '../controllers/groups';
import { ApiResponse, Group, CreateGroupRequest, UpdateGroupRequest, ReorderGroupsRequest } from '../types/index';

const router = Router({ mergeParams: true });

// GET /api/users/:userId/groups - List all groups for user (ordered by sort_order)
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    const groups = await groupsController.getGroupsByUserId(userId);
    const response: ApiResponse<Group[]> = { data: groups };
    res.json(response);
  })
);

// POST /api/users/:userId/groups - Create new group
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const createReq: CreateGroupRequest = req.body;

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    if (!createReq.name || createReq.name.trim().length === 0) {
      const response: ApiResponse<never> = { error: 'Group name is required' };
      res.status(400).json(response);
      return;
    }

    const group = await groupsController.createGroup(userId, createReq.name);
    const response: ApiResponse<Group> = { data: group };
    res.status(201).json(response);
  })
);

// PUT /api/users/:userId/groups/:id - Update group name
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const groupId = parseInt(req.params.id, 10);
    const updateReq: UpdateGroupRequest = req.body;

    if (isNaN(userId) || isNaN(groupId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID or group ID' };
      res.status(400).json(response);
      return;
    }

    if (!updateReq.name || updateReq.name.trim().length === 0) {
      const response: ApiResponse<never> = { error: 'Group name is required' };
      res.status(400).json(response);
      return;
    }

    const group = await groupsController.updateGroup(userId, groupId, updateReq.name);
    const response: ApiResponse<Group> = { data: group };
    res.json(response);
  })
);

// PUT /api/users/:userId/groups/reorder - Batch reorder groups
router.put(
  '/reorder/batch',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const reorderReq: ReorderGroupsRequest = req.body;

    if (isNaN(userId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID' };
      res.status(400).json(response);
      return;
    }

    if (!Array.isArray(reorderReq.groups) || reorderReq.groups.length === 0) {
      const response: ApiResponse<never> = { error: 'Groups array is required' };
      res.status(400).json(response);
      return;
    }

    const groups = await groupsController.reorderGroups(userId, reorderReq.groups);
    const response: ApiResponse<Group[]> = { data: groups };
    res.json(response);
  })
);

// DELETE /api/users/:userId/groups/:id - Delete group (cascades to accounts and transactions)
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    const groupId = parseInt(req.params.id, 10);

    if (isNaN(userId) || isNaN(groupId)) {
      const response: ApiResponse<never> = { error: 'Invalid user ID or group ID' };
      res.status(400).json(response);
      return;
    }

    await groupsController.deleteGroup(userId, groupId);
    const response: ApiResponse<{ success: boolean }> = { data: { success: true } };
    res.json(response);
  })
);

export default router;
