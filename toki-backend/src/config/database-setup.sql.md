# File: toki-backend/src/config/database-setup.sql

### Summary
Database schema initialization script. Creates tables for users, tokis, participants, connections, notifications, saved tokis, and indexes.

### Fixes Applied log
- problem: No table to store push notification tokens for devices.
- solution: Added `push_tokens` table with user_id, token, platform, updated_at, and unique constraint on token. Added index on user_id for fast lookups.

### How Fixes Were Implemented
- Created `push_tokens` table with:
  - `id SERIAL PRIMARY KEY`
  - `user_id UUID REFERENCES users(id) ON DELETE CASCADE`
  - `token VARCHAR(255) NOT NULL` with `UNIQUE(token)` constraint
  - `platform VARCHAR(16) NOT NULL` (ios/android/web/unknown)
  - `updated_at TIMESTAMP NOT NULL DEFAULT NOW()`
- Created index `idx_push_tokens_user_id` for efficient queries by user_id.
- Table supports multiple tokens per user (different devices) but unique token constraint prevents duplicates.

