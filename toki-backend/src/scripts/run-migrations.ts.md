# File: run-migrations.ts

### Summary
Script that runs idempotent SQL migrations on server startup. Now includes the `app_settings` table migration for configurable password link expiry.

### Fixes Applied log
- Added execution of `create-app-settings.sql` as Migration 7.

### How Fixes Were Implemented
- Read `create-app-settings.sql` from the scripts directory and execute it; handle "already exists" errors gracefully and continue. 


