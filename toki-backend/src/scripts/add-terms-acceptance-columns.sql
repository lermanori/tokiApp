-- Migration: Add terms acceptance tracking to users table
-- This migration adds columns to track when users accept Terms of Use and which version

-- Add terms_accepted_at column to track when user accepted terms
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- Add terms_version column to track which version was accepted
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(50);

-- Create index for performance on terms_accepted_at
CREATE INDEX IF NOT EXISTS idx_users_terms_accepted_at ON users(terms_accepted_at);

-- Note: Current terms version is set in backend code (e.g., '2025-12-27')
-- Existing users will be prompted to accept terms on next login
