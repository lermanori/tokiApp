-- Migration: Add external_link column to tokis table
-- This migration adds the external_link column if it doesn't exist

ALTER TABLE tokis ADD COLUMN IF NOT EXISTS external_link VARCHAR(500);



