# File: create-app-settings.sql

### Summary
Creates a simple `app_settings` table for key/value configuration, and seeds the `password_reset_expiry_hours` key to 2 hours by default.

### Fixes Applied log
- Added `app_settings` table with `key TEXT PRIMARY KEY`, `value JSONB`, and `updated_at` timestamp.
- Seeded default `password_reset_expiry_hours` to `2`.

### How Fixes Were Implemented
- Idempotent SQL uses `IF NOT EXISTS` for table creation and `ON CONFLICT DO NOTHING` for default seed to be safe across multiple runs. 


