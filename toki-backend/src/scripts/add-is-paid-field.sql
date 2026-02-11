-- Migration: Add is_paid field to tokis table
-- Purpose: Add a boolean field to track whether a Toki is a paid or free event
-- Author: Claude Code
-- Date: 2026-02-11

-- Add is_paid column to tokis table
-- Default to FALSE for all existing and new Tokis
ALTER TABLE tokis
ADD COLUMN is_paid BOOLEAN DEFAULT FALSE NOT NULL;

-- Update all existing Tokis to be free (redundant but explicit)
UPDATE tokis SET is_paid = FALSE WHERE is_paid IS NULL;

-- Add comment to column for documentation
COMMENT ON COLUMN tokis.is_paid IS 'Indicates whether the event is paid (true) or free (false). Defaults to false.';
