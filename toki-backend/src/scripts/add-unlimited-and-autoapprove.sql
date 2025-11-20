-- Migration: Add unlimited max attendees and auto-approve features
-- Run this migration to add the auto_approve column and allow NULL for max_attendees

-- Step 1: Allow NULL for max_attendees (NULL = unlimited)
ALTER TABLE tokis ALTER COLUMN max_attendees DROP NOT NULL;

-- Step 2: Add auto_approve column if it doesn't exist
ALTER TABLE tokis ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN DEFAULT FALSE;

-- Step 3: Update existing rows to have auto_approve = false if NULL
UPDATE tokis SET auto_approve = FALSE WHERE auto_approve IS NULL;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'tokis' 
  AND column_name IN ('max_attendees', 'auto_approve');

