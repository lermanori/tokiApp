### Summary
`auth.ts` defines authentication and user profile routes. We augmented `PUT /auth/me` to support updating the user's location and precise coordinates, enabling backend distance calculations that depend on `users.latitude` and `users.longitude`.

### Fixes Applied log
- problem: No single endpoint to set `latitude`/`longitude`; distance showed 0.0 for users without stored coords.
- solution: Extended `PUT /auth/me` to accept optional `latitude` and `longitude`, validate ranges, and persist both together with existing fields.

### How Fixes Were Implemented
- Added optional request fields `latitude` and `longitude` with validation: both required together, numeric, lat ∈ [-90, 90], lng ∈ [-180, 180].
- Switched to a dynamic update builder to only modify provided fields and always bump `updated_at`.
- Response now includes `latitude` and `longitude` so the client can immediately update state.
# File: toki-backend/src/routes/auth.ts

### Summary
Authentication routes. Verbose debug prints on `/me` and search endpoints are now gated behind debug.

### Fixes Applied log
- problem: `/me` and search emitted many query/result logs each request.
- solution: Moved detailed prints to `debug`. Kept errors as errors.

### How Fixes Were Implemented
- Imported `utils/logger` and replaced noisy `console.log` with `logger.debug`.
- Converted `console.error` to `logger.error` consistently.


