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
      `UPDATE scheduled_notifications
       SET last_sent_at = NOW()
       WHERE enabled = true
         AND day_of_week = $1
         AND hour = $2
         AND minute = $3
         AND (last_sent_at IS NULL OR DATE(last_sent_at) < CURRENT_DATE)
       RETURNING id, title, message`,
      [dayOfWeek, hour, minute]
    );

    if (result.rows.length === 0) {
      return; // No notifications to send (or already claimed by another cron job instance)
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
 * Check for events happening today and send reminders
 * Runs daily at 09:00 UTC
 */
async function checkAndSendEventDayNotifications() {
  try {
    logger.info('🎉 [EVENT-DAY] Checking for events happening today...');

    // Find all active tokis with scheduled_time today (UTC)
    const tokisResult = await pool.query(
      `SELECT id, title, scheduled_time
       FROM tokis
       WHERE status = 'active'
         AND scheduled_time IS NOT NULL
         AND DATE(scheduled_time) = CURRENT_DATE
         AND (last_event_reminder_sent_at IS NULL OR DATE(last_event_reminder_sent_at) < CURRENT_DATE)`
    );

    if (tokisResult.rows.length === 0) {
      logger.info('🎉 [EVENT-DAY] No events happening today (or all reminded already)');
      return;
    }

    logger.info(`🎉 [EVENT-DAY] Found ${tokisResult.rows.length} event(s) happening today`);

    for (const toki of tokisResult.rows) {
      try {
        // Find users who saved or joined this toki (or are the host), excluding muted users
        const usersResult = await pool.query(
          `SELECT DISTINCT u.id
           FROM users u
           WHERE u.id IN (
             -- Users who saved the toki
             SELECT st.user_id FROM saved_tokis st WHERE st.toki_id = $1
             UNION
             -- Users who joined the toki (approved participants)
             SELECT tp.user_id FROM toki_participants tp WHERE tp.toki_id = $1 AND tp.status = 'approved'
             UNION
             -- The host
             SELECT t.host_id FROM tokis t WHERE t.id = $1
           )
           -- Exclude muted users
           AND u.id NOT IN (
             SELECT tnm.user_id FROM toki_notification_mutes tnm WHERE tnm.toki_id = $1
           )`,
          [toki.id]
        );

        const userIds = usersResult.rows.map((row: any) => row.id);

        if (userIds.length === 0) {
          logger.info(`🎉 [EVENT-DAY] No eligible users for event: ${toki.title}`);
          continue;
        }

        await sendPushToUsers(userIds, {
          title: 'Happening Today 🎉',
          body: `${toki.title} is happening today. Don't miss it!`,
          data: { type: 'event_reminder', tokiId: toki.id }
        });

        // Update the toki to track that it sent its reminder today
        await pool.query(
          `UPDATE tokis SET last_event_reminder_sent_at = NOW() WHERE id = $1`,
          [toki.id]
        );

        logger.info(`✅ [EVENT-DAY] Reminder sent for "${toki.title}" to ${userIds.length} users`);
      } catch (error) {
        logger.error(`❌ [EVENT-DAY] Error sending reminder for toki ${toki.id}:`, error);
      }
    }
  } catch (error) {
    logger.error('❌ [EVENT-DAY] Error checking event day notifications:', error);
  }
}

/**
 * Start the notification scheduler
 * Runs a cron job every minute to check for notifications
 * Runs a daily cron at 09:00 UTC to send event day reminders
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

  // Run daily at 09:00 UTC: 0 9 * * *
  cron.schedule('0 9 * * *', async () => {
    await checkAndSendEventDayNotifications();
  });

  schedulerStarted = true;
  logger.info('✅ [SCHEDULER] Notification scheduler started (checking every minute + daily at 09:00 UTC)');
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
