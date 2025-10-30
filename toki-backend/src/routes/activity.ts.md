### Summary
Provides endpoints for listing a user’s activity and toggling per-Toki visibility on their public profile.

### Fixes Applied log
- problem: No API to expose activity lists or hide/show items.
- solution: Added `GET /api/activity/me/activity`, `GET /api/activity/users/:userId/activity`, and POST/DELETE hide endpoints.
 - solution: Added `GET /api/activity/me/activity`, `GET /api/activity/users/:userId/activity`, and POST/DELETE hide endpoints.

### How Fixes Were Implemented
- Owner list joins `user_hidden_activities` to surface `is_hidden` for UI toggles.
- Public list excludes private Tokis and anything the user hid.
- POST/DELETE modify `user_hidden_activities` records idempotently.
- Filtered to future events only: `(scheduled_time IS NULL OR scheduled_time >= NOW())`.


