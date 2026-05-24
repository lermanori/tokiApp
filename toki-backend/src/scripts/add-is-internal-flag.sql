-- Add is_internal flag to users table
-- Allows admins to mark accounts (e.g. own dev/test accounts) so they can be
-- separated from real-user metrics in the admin Analytics dashboard.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_is_internal ON users(is_internal) WHERE is_internal = TRUE;
