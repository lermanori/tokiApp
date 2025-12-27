# File: create-admin-logs-table.sql

### Summary
This migration creates the `admin_logs` table for tracking user blocks and other admin/moderation actions. This table provides an audit trail required for Apple App Review Guideline 1.2 compliance.

### Fixes Applied log
- **problem**: No migration file for admin_logs table (was only in database-setup.sql)
- **solution**: Created proper migration file following project's migration pattern.

### How Fixes Were Implemented
- Created `create-admin-logs-table.sql` migration file
- Added table with fields: id, action_type, admin_id, target_id, target_type, details (JSONB), created_at
- Added performance indexes on action_type, (target_type, target_id), and created_at
- Added table comment explaining purpose
- Integrated into run-migrations.ts as Migration 17

### Purpose
This table tracks:
- User blocks (action_type: 'user_block')
- User unblocks (action_type: 'user_unblock')
- Other moderation actions (content deletion, etc.)

Each log entry includes:
- Who performed the action (admin_id)
- What was targeted (target_id, target_type)
- Additional context (details JSONB)
- Timestamp (created_at)

### Dependencies
- Requires users table to exist (foreign key reference)
- Uses UUID extension (gen_random_uuid())
- Uses JSONB for flexible details storage
