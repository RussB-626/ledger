// Group management controllers
// Per CLAUDE.md: All code is TypeScript with explicit types, all API responses use { data, error } format

import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../db';
import { Group } from '../types/index';

// Get all groups for a user, ordered by sort_order
export async function getGroupsByUserId(userId: number): Promise<Group[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, name, sort_order FROM groups WHERE user_id = ? ORDER BY sort_order ASC',
      [userId]
    );
    return rows as Group[];
  } finally {
    connection.release();
  }
}

// Get group by ID (verify ownership)
export async function getGroupById(userId: number, groupId: number): Promise<Group | null> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT id, user_id, name, sort_order FROM groups WHERE id = ? AND user_id = ?',
      [groupId, userId]
    );
    if (rows.length === 0) {
      return null;
    }
    return rows[0] as Group;
  } finally {
    connection.release();
  }
}

// Create a new group for a user
export async function createGroup(userId: number, name: string): Promise<Group> {
  const connection = await pool.getConnection();
  try {
    // Get the next sort_order value
    const [maxOrderResult] = await connection.query<RowDataPacket[]>(
      'SELECT MAX(sort_order) as maxOrder FROM groups WHERE user_id = ?',
      [userId]
    );
    const nextOrder = ((maxOrderResult[0] as any)?.maxOrder ?? 0) + 1;

    const [result] = await connection.query<ResultSetHeader>(
      'INSERT INTO groups (user_id, name, sort_order) VALUES (?, ?, ?)',
      [userId, name, nextOrder]
    );

    const group = await getGroupById(userId, result.insertId);
    if (!group) {
      throw new Error('Failed to retrieve created group');
    }
    return group;
  } finally {
    connection.release();
  }
}

// Update group name
export async function updateGroup(userId: number, groupId: number, name: string): Promise<Group> {
  const connection = await pool.getConnection();
  try {
    // Verify group exists and belongs to user
    const existingGroup = await getGroupById(userId, groupId);
    if (!existingGroup) {
      throw new Error('Group not found');
    }

    await connection.query(
      'UPDATE groups SET name = ? WHERE id = ? AND user_id = ?',
      [name, groupId, userId]
    );

    const updatedGroup = await getGroupById(userId, groupId);
    if (!updatedGroup) {
      throw new Error('Failed to retrieve updated group');
    }
    return updatedGroup;
  } finally {
    connection.release();
  }
}

// Batch reorder groups
export async function reorderGroups(
  userId: number,
  groupsWithOrder: Array<{ id: number; sort_order: number }>
): Promise<Group[]> {
  const connection = await pool.getConnection();
  try {
    // Update sort_order for each group
    for (const group of groupsWithOrder) {
      await connection.query(
        'UPDATE groups SET sort_order = ? WHERE id = ? AND user_id = ?',
        [group.sort_order, group.id, userId]
      );
    }

    // Return updated groups
    return await getGroupsByUserId(userId);
  } finally {
    connection.release();
  }
}

// Delete group (cascade deletes accounts and transactions via FK constraints)
export async function deleteGroup(userId: number, groupId: number): Promise<void> {
  const connection = await pool.getConnection();
  try {
    // Verify group exists and belongs to user
    const existingGroup = await getGroupById(userId, groupId);
    if (!existingGroup) {
      throw new Error('Group not found');
    }

    // Delete group (accounts and transactions cascade delete via FK)
    await connection.query(
      'DELETE FROM groups WHERE id = ? AND user_id = ?',
      [groupId, userId]
    );
  } finally {
    connection.release();
  }
}
