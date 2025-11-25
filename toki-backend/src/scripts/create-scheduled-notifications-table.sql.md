# File: toki-backend/src/scripts/create-scheduled-notifications-table.sql

### Summary
Database migration script that creates the scheduled_notifications table for storing scheduled push notifications with their schedule (day, hour, minute) and status.

### Fixes Applied log
- problem: No database table for scheduled notifications.
- solution: Created scheduled_notifications table with fields for title, message, day_of_week, hour, minute, enabled status, last_sent_at tracking, and timestamps.

### How Fixes Were Implemented
- Created table with UUID primary key and all required fields.
- Added CHECK constraints to ensure day_of_week (0-6), hour (0-23), and minute (0-59) are valid.
- Created indexes on (day_of_week, hour, minute) for efficient scheduler queries and on enabled for filtering.
- Includes created_at and updated_at timestamps for tracking.

