### Summary
Provides endpoints for listing a user's activity and toggling per-Toki visibility on their public profile.

### Fixes Applied log
- problem: No API to expose activity lists or hide/show items.
- solution: Added `GET /api/activity/me/activity`, `GET /api/activity/users/:userId/activity`, and POST/DELETE hide endpoints.
- problem: Toki images weren't loading in activity lists (profile screen and user profile screen) - only showing default category pictures.
- solution: Updated both activity endpoints to use `COALESCE((t.image_urls)[1], t.image_url) as image_url` to prioritize the first image from the `image_urls` array, falling back to the legacy `image_url` field. Added `t.image_urls` to GROUP BY clauses.
- problem: Activity was visible to all users regardless of connection status.
- solution: Added connection check to `/users/:userId/activity` endpoint - only returns activity if viewer has accepted connection with profile owner, or if viewer is viewing their own profile.

### How Fixes Were Implemented
- Owner list joins `user_hidden_activities` to surface `is_hidden` for UI toggles.
- Public list excludes private Tokis and anything the user hid.
- POST/DELETE modify `user_hidden_activities` records idempotently.
- Filtered to future events only: `(scheduled_time IS NULL OR scheduled_time >= NOW())`.
- Image field now checks `image_urls` array first (first element `[1]` in PostgreSQL), then falls back to `image_url` for backward compatibility with older Tokis.
- Connection check queries `user_connections` table for accepted status between viewer and profile owner. Returns empty array if no connection exists (except when viewing own profile). Special case allows users to always see their own activity.


