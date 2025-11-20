-- Migration: Add invitation_credits column to users table
-- This allows users to have a base number of invitations they can send

ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_credits INTEGER DEFAULT 3;

-- Update existing users to have default credits if they don't have any
UPDATE users SET invitation_credits = 3 WHERE invitation_credits IS NULL;

-- Add comment to column
COMMENT ON COLUMN users.invitation_credits IS 'Number of invitation credits available to the user. Default is 3. Admins can grant additional credits.';

