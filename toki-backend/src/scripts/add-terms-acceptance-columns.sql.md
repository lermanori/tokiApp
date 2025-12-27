# File: add-terms-acceptance-columns.sql

### Summary
This migration script adds two new columns to the users table to track Terms of Use acceptance: `terms_accepted_at` (timestamp of acceptance) and `terms_version` (version string that was accepted). It also adds an index on `terms_accepted_at` for query performance.

### Fixes Applied log
- problem: Database lacked tracking for Terms of Use acceptance, required for Apple App Review compliance
- solution: Added `terms_accepted_at` TIMESTAMPTZ column to store acceptance timestamp
- solution: Added `terms_version` VARCHAR(50) column to track which version was accepted
- solution: Added index on `terms_accepted_at` for performance

### How Fixes Were Implemented
- problem: Users need to accept terms to comply with App Store guidelines
- solution: Created migration script with IF NOT EXISTS clauses to safely add columns
- solution: Added index for efficient querying of terms acceptance status
- solution: Current version is managed in backend code for easy updates
