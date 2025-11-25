# File: toki-backend/src/services/notificationScheduler.ts

### Summary
Service that manages scheduled push notifications using node-cron. Checks every minute for notifications that match the current day, hour, and minute, then sends them to all users via push notifications.

### Fixes Applied log
- problem: No scheduled notification system existed.
- solution: Created notification scheduler service using node-cron that runs every minute, queries for matching notifications, sends push notifications to all users, and updates last_sent_at timestamps.

### How Fixes Were Implemented
- Uses node-cron library to schedule a job that runs every minute (* * * * *).
- Queries scheduled_notifications table for enabled notifications matching current day_of_week, hour, and minute.
- Prevents duplicate sends by checking that last_sent_at is NULL or from a previous day.
- Fetches all user IDs from users table and sends push notifications using existing sendPushToUsers utility.
- Updates last_sent_at timestamp after successful send to prevent duplicate notifications on the same day.
- Includes error handling and logging for debugging and monitoring.

