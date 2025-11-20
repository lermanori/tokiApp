### Summary
`auth.ts` defines authentication and user profile routes. We further enhanced `PUT /auth/me` so that when a user submits a location string without coordinates, the backend derives `latitude`/`longitude` via Google Geocoding.

### Fixes Applied log
- problem: Typed location updates from the client often lacked coordinates, leaving stale/missing lat/lng.
- solution: If only `location` is provided, `PUT /auth/me` now geocodes the address server-side (when `GOOGLE_MAPS_API_KEY` is configured) and persists the derived coordinates.

### How Fixes Were Implemented
- Kept existing validation: if either coordinate is present, both are required and validated (numeric and in-range).
- Added geocoding branch: when `location` is a non-empty string and no coords are provided, call Google Geocoding and, on success, set `latNumber`/`lngNumber` for persistence.
- Did not overwrite the submitted `location` string; only enriched with coordinates.

### Notes
- If `GOOGLE_MAPS_API_KEY` is missing or geocoding fails, the update proceeds without coordinates.
# File: toki-backend/src/routes/auth.ts

### Summary
Authentication routes. Verbose debug prints on `/me` and search endpoints are now gated behind debug.

### Fixes Applied log
- problem: `/me` and search emitted many query/result logs each request.
- solution: Moved detailed prints to `debug`. Kept errors as errors.

### How Fixes Were Implemented
- Imported `utils/logger` and replaced noisy `console.log` with `logger.debug`.
- Converted `console.error` to `logger.error` consistently.

- problem: Profile page "My Tokis" counter showed incorrect count (4 instead of 3) because stats queries didn't filter out tokis more than 12 hours past their scheduled time, unlike the main tokis query.
- solution: Added 12-hour filter `AND (scheduled_time IS NULL OR scheduled_time >= NOW() - INTERVAL '12 hours')` to both `tokisCreated` and `tokisJoined` count queries in `/api/auth/me` endpoint to match the main tokis query behavior.

### How Fixes Were Implemented
- Updated `tokisCreated` query to include: `AND (scheduled_time IS NULL OR scheduled_time >= NOW() - INTERVAL '12 hours')`
- Updated `tokisJoined` query to include: `AND (t.scheduled_time IS NULL OR t.scheduled_time >= NOW() - INTERVAL '12 hours')`
- This ensures profile stats match what users see in the "My Tokis" screen, excluding past events beyond the 12-hour window.

### Fixes Applied log (Activity Tracking)
- Added: Login event logging to user_activity_logs table

### How Fixes Were Implemented (Activity Tracking)
- After successful password validation and token generation in `/api/auth/login` endpoint
- Inserts 'login' event into `user_activity_logs` table with user_id and event_type
- Added error handling to ensure login proceeds even if activity logging fails
- Activity logging is non-blocking and doesn't affect authentication flow
- Enables accurate login tracking for analytics dashboard

