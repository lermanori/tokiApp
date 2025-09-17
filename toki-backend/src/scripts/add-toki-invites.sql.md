# File: toki-backend/src/scripts/add-toki-invites.sql

### Summary
Creates the `toki_invites` table to support invite-only (private) Tokis. Includes indexes and a uniqueness constraint per `(toki_id, invited_user_id)`.

### Fixes Applied log
- problem: Backend queries referenced `toki_invites` causing `relation "toki_invites" does not exist`.
- solution: Added SQL migration to create `toki_invites` with required columns, constraints and indexes.

### How Fixes Were Implemented
- Added `id` (UUID), `toki_id`, `invited_user_id`, `invited_by`, `status`, timestamps.
- Added FK with `ON DELETE CASCADE` to keep data consistent when Tokis or users are removed.
- Added indexes on `toki_id` and `invited_user_id` to speed permission checks.

