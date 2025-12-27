# File: run-migrations.ts

### Summary
Database migration runner that executes all SQL migrations in sequence. Updated to include Migration 16 for the unified content_reports table.

### Fixes Applied
- Added: Migration 16 for creating content_reports table
- Added: Proper error handling for existing table (42P07 error code)
- Added: Skip message if table already exists

### How Fixes Were Implemented
- Reads create-unified-content-reports.sql file from scripts directory
- Executes SQL to create table with all indexes and constraints
- Handles idempotent execution (safe to run multiple times)
- Follows same pattern as other migrations for consistency
