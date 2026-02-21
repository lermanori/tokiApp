-- Migration: Add social authentication columns
-- Run this migration to enable Apple and Google Sign-In

-- Add OAuth provider identifiers
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_sub VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255) UNIQUE;

-- Track which auth provider(s) the user uses
-- Values: 'email', 'apple', 'google', 'apple+email', 'google+email', 'apple+google', 'apple+google+email'
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'email';

-- Track if user has set a password (OAuth users may not have one)
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT true;

-- Track if OAuth user has completed their profile (location + terms)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT true;

-- Create indexes for OAuth lookups
CREATE INDEX IF NOT EXISTS idx_users_apple_sub ON users(apple_sub) WHERE apple_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- Update existing users to have correct defaults
UPDATE users SET has_password = true WHERE has_password IS NULL;
UPDATE users SET profile_completed = true WHERE profile_completed IS NULL;
UPDATE users SET auth_provider = 'email' WHERE auth_provider IS NULL;
