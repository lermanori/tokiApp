# File: create-user-activity-logs.sql

### Summary
This file contains the database migration script to create the `user_activity_logs` table for tracking user activity events. This table stores login events, WebSocket connections, and disconnections for accurate analytics.

### Features
- Tracks three event types: 'login', 'connect', 'disconnect'
- Foreign key relationship with users table (cascades on delete)
- Multiple indexes for query performance
- Timestamp tracking for time-series analytics

### Fixes Applied
- N/A (new table)

### How Fixes Were Implemented
- Created `user_activity_logs` table with UUID primary key
- Added `user_id` foreign key with CASCADE delete
- Added `event_type` VARCHAR(20) for event classification
- Added `created_at` TIMESTAMPTZ for timestamp tracking
- Created indexes on:
  - `user_id` for user-specific queries
  - `event_type` for filtering by event type
  - `created_at` for time-based queries
  - Composite index on `(user_id, event_type, created_at)` for efficient time-series queries
- Added table and column comments for documentation

