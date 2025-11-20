# File: run-migrations.ts

### Summary
Script that runs idempotent SQL migrations on server startup. Includes migrations for admin role, algorithm hyperparameters, email templates, user hidden activities, push tokens, external links, app settings, user activity logs, invitation credits, invitations table, and unlimited max attendees with auto-approve.

### Fixes Applied log
- Added execution of `add-unlimited-and-autoapprove.sql` as Migration 11
- Migration adds support for unlimited max attendees (NULL value) and auto-approve feature

### How Fixes Were Implemented
- Added Migration 11 block that reads and executes `add-unlimited-and-autoapprove.sql`
- Migration handles column already exists errors gracefully (idempotent)
- Logs success or skip message for the migration
- Migration allows NULL for max_attendees (unlimited) and adds auto_approve BOOLEAN column
