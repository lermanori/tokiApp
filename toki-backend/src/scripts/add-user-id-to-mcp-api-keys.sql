-- Migration: Add user_id column to mcp_api_keys table
-- This ties API keys to specific users who will be the author for Tokis created with the key

-- Add user_id column (nullable initially for existing rows)
ALTER TABLE mcp_api_keys
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- For existing rows without user_id, we can't automatically assign one
-- They will need to be updated manually or recreated
-- For now, we'll make it nullable but new keys require it

-- Add NOT NULL constraint after data migration (commented out for safety)
-- ALTER TABLE mcp_api_keys ALTER COLUMN user_id SET NOT NULL;

