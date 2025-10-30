### Summary
Creates `user_hidden_activities` to store which Tokis a user hides from their public profile.

### Fixes Applied log
- problem: No place to persist per-Toki visibility for user profiles.
- solution: Added a dedicated table with unique `(user_id, toki_id)` and helpful indexes.

### How Fixes Were Implemented
- New table with FK to `users` and `tokis`, `created_at` timestamp, and unique constraint to avoid duplicates.
- Indexes on `user_id` and `toki_id` for fast lookups.


