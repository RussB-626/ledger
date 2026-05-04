import { Router, Request, Response } from 'express';
import * as backupsController from '../controllers/backups';

const router = Router();

// Create manual backup
router.post('/:userId/backups', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const result = await backupsController.createBackup(userId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Server error: ${message}` });
  }
});

// Restore from uploaded backup
router.post('/:userId/backups/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);
    const { backupData, targetUserId, mode } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    if (!backupData || !targetUserId || !mode) {
      res.status(400).json({ error: 'Missing required fields: backupData, targetUserId, mode' });
      return;
    }

    if (!['overwrite', 'merge'].includes(mode)) {
      res.status(400).json({ error: 'Invalid mode. Must be overwrite or merge' });
      return;
    }

    // Convert base64 backupData to Buffer
    const backupBuffer = Buffer.from(backupData, 'base64');

    const result = await backupsController.restoreBackup(
      backupBuffer,
      parseInt(targetUserId),
      mode as 'overwrite' | 'merge'
    );

    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Server error: ${message}` });
  }
});

// Update backup settings
router.put('/:userId/backups/settings', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId);
    const settings = req.body;

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Invalid backup settings' });
      return;
    }

    const result = await backupsController.updateBackupSettings(userId, settings);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Server error: ${message}` });
  }
});

export default router;
