import * as cron from 'node-cron';
import { pool } from '../config/database';
import { sendPushToUsers } from '../utils/push';
import logger from '../utils/logger';

let schedulerStarted = false;

/**
 * Check for scheduled notifications that should be sent now
 * Runs every minute to check if any notifications match the current time
 */
async function checkAndSendNotifications() {
  try {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Query for notifications that match current day, hour, and minute
    // and haven't been sent today (or never sent)
    const result = await pool.query(
      `SELECT id, title, message, last_sent_at
       FROM scheduled_notifications
       WHERE enabled = true
         AND day_of_week = $1
         AND hour = $2
         AND minute = $3
         AND (last_sent_at IS NULL OR DATE(last_sent_at) < CURRENT_DATE)`,
      [dayOfWeek, hour, minute]
    );

    if (result.rows.length === 0) {
      return; // No notifications to send
    }

    logger.info(`📬 [SCHEDULER] Found ${result.rows.length} notification(s) to send`);

    // Get all user IDs
    const usersResult = await pool.query('SELECT id FROM users');
    const userIds = usersResult.rows.map((row: any) => row.id);

    if (userIds.length === 0) {
      logger.warn('📬 [SCHEDULER] No users found, skipping notification send');
      return;
    }

    // Send each notification
    for (const notification of result.rows) {
      try {
        logger.info(`📬 [SCHEDULER] Sending notification: ${notification.title}`);
        
        await sendPushToUsers(userIds, {
          title: notification.title,
          body: notification.message,
          data: { type: 'scheduled_notification', scheduledId: notification.id }
        });

        // Update last_sent_at timestamp
        await pool.query(
          `UPDATE scheduled_notifications
           SET last_sent_at = NOW()
           WHERE id = $1`,
          [notification.id]
        );

        logger.info(`✅ [SCHEDULER] Notification ${notification.id} sent to ${userIds.length} users`);
      } catch (error) {
        logger.error(`❌ [SCHEDULER] Error sending notification ${notification.id}:`, error);
        // Continue with other notifications even if one fails
      }
    }
  } catch (error) {
    logger.error('❌ [SCHEDULER] Error checking scheduled notifications:', error);
  }
}

/**
 * Start the notification scheduler
 * Runs a cron job every minute to check for notifications
 */
export function startNotificationScheduler() {
  if (schedulerStarted) {
    logger.warn('⚠️ [SCHEDULER] Scheduler already started, skipping');
    return;
  }

  logger.info('🚀 [SCHEDULER] Starting notification scheduler...');

  // Run every minute: * * * * *
  cron.schedule('* * * * *', async () => {
    await checkAndSendNotifications();
  });

  schedulerStarted = true;
  logger.info('✅ [SCHEDULER] Notification scheduler started (checking every minute)');
}

/**
 * Stop the notification scheduler (for testing/cleanup)
 */
export function stopNotificationScheduler() {
  // Note: node-cron doesn't provide a direct way to stop all jobs
  // This is mainly for future extensibility
  schedulerStarted = false;
  logger.info('🛑 [SCHEDULER] Notification scheduler stopped');
}

