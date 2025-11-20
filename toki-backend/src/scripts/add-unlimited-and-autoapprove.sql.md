# File: add-unlimited-and-autoapprove.sql

### Summary
SQL migration script to add support for unlimited max attendees and auto-approve join requests feature.

### Fixes Applied log
- problem: Need to support unlimited max attendees (NULL value)
- solution: ALTER TABLE to allow NULL for max_attendees column

- problem: Need auto-approve feature for join requests
- solution: ADD COLUMN auto_approve BOOLEAN DEFAULT FALSE

### How Fixes Were Implemented
- Step 1: ALTER TABLE tokis ALTER COLUMN max_attendees DROP NOT NULL - allows NULL values (unlimited)
- Step 2: ALTER TABLE tokis ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN DEFAULT FALSE - adds auto-approve column
- Step 3: UPDATE tokis SET auto_approve = FALSE WHERE auto_approve IS NULL - ensures all existing rows have a value
- Includes verification query to check column definitions

