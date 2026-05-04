import cron from 'node-cron';
import { RowDataPacket } from 'mysql2/promise';
import pool from '../db';
import { backupService } from '../services/backupService';

interface ScheduledJob {
  userId: number;
  task: cron.ScheduledTask;
}

const scheduledJobs: Map<number, ScheduledJob> = new Map();

function generateCronExpression(
  frequency: string,
  time: string,
  dayOfWeek?: number,
  dayOfMonth?: number
): string {
  const [hours, minutes] = time.split(':');

  switch (frequency) {
    case 'daily':
      return `${minutes} ${hours} * * *`;
    case 'weekly':
      return `${minutes} ${hours} * * ${dayOfWeek ?? 0}`;
    case 'monthly':
      return `${minutes} ${hours} ${dayOfMonth ?? 1} * *`;
    default:
      return `${minutes} ${hours} * * *`;
  }
}

async function executeBackupJob(userId: number, backup_count: number): Promise<void> {
  try {
    console.log(`[Backup] Starting backup for user ${userId}`);
    const result = await backupService.createBackup(userId);

    if (result.success) {
      console.log(`[Backup] Successfully created backup for user ${userId}: ${result.filename}`);
      await backupService.cleanOldBackups(userId, backup_count);
      console.log(`[Backup] Cleaned up old backups for user ${userId}`);
    } else {
      console.error(`[Backup] Failed to create backup for user ${userId}: ${result.error}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Backup] Error executing backup job for user ${userId}: ${message}`);
  }
}

export async function initializeBackupScheduler(): Promise<void> {
  try {
    console.log('[Scheduler] Initializing backup scheduler...');

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, backup_enabled, backup_frequency, backup_time, backup_day_of_week, backup_day_of_month, backup_count FROM users WHERE backup_enabled = 1'
    );

    const users = rows as Array<{
      id: number;
      backup_enabled: number;
      backup_frequency: string;
      backup_time: string;
      backup_day_of_week?: number;
      backup_day_of_month?: number;
      backup_count: number;
    }>;

    if (users.length === 0) {
      console.log('[Scheduler] No users with backups enabled');
      return;
    }

    console.log(`[Scheduler] Scheduling backups for ${users.length} user(s)`);

    for (const user of users) {
      try {
        const cronExpression = generateCronExpression(
          user.backup_frequency,
          user.backup_time,
          user.backup_day_of_week,
          user.backup_day_of_month
        );

        const task = cron.schedule(cronExpression, () => {
          executeBackupJob(user.id, user.backup_count);
        });

        scheduledJobs.set(user.id, { userId: user.id, task });

        console.log(
          `[Scheduler] Scheduled backup for user ${user.id} (${user.backup_frequency} at ${user.backup_time}) cron: ${cronExpression}`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Scheduler] Failed to schedule backup for user ${user.id}: ${message}`);
      }
    }

    console.log('[Scheduler] Backup scheduler initialized successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scheduler] Failed to initialize backup scheduler:', message);
  }
}

export function updateBackupSchedule(userId: number, frequency: string, time: string, dayOfWeek?: number, dayOfMonth?: number, backup_count?: number): void {
  try {
    // Cancel existing job if it exists
    const existing = scheduledJobs.get(userId);
    if (existing) {
      existing.task.stop();
      scheduledJobs.delete(userId);
      console.log(`[Scheduler] Stopped existing backup schedule for user ${userId}`);
    }

    // Create new job with updated settings
    const cronExpression = generateCronExpression(frequency, time, dayOfWeek, dayOfMonth);
    const task = cron.schedule(cronExpression, () => {
      executeBackupJob(userId, backup_count ?? 5);
    });

    scheduledJobs.set(userId, { userId, task });
    console.log(`[Scheduler] Updated backup schedule for user ${userId} (${frequency} at ${time}) cron: ${cronExpression}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Scheduler] Failed to update backup schedule for user ${userId}: ${message}`);
  }
}

export function removeBackupSchedule(userId: number): void {
  try {
    const existing = scheduledJobs.get(userId);
    if (existing) {
      existing.task.stop();
      scheduledJobs.delete(userId);
      console.log(`[Scheduler] Removed backup schedule for user ${userId}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Scheduler] Failed to remove backup schedule for user ${userId}: ${message}`);
  }
}

export function getScheduledJobs(): ScheduledJob[] {
  return Array.from(scheduledJobs.values());
}
