# File: run-migrations.ts

### Summary
Script that runs idempotent SQL migrations on server startup. Includes migrations for admin role, algorithm hyperparameters, email templates, user hidden activities, push tokens, external links, app settings, and user activity logs.

### Fixes Applied log
- Added execution of `create-app-settings.sql` as Migration 7
- Added execution of `create-user-activity-logs.sql` as Migration 8

### How Fixes Were Implemented
- Added Migration 7 block that reads and executes `create-app-settings.sql`
- Added Migration 8 block that reads and executes `create-user-activity-logs.sql`
- Both migrations handle table already exists errors gracefully (idempotent)
- Logs success or skip message for each migration
- Migration 8 creates user_activity_logs table for tracking login events and WebSocket connections/disconnections 


