# File: passwordReset.ts

### Summary
Helper utilities to issue time-limited password links by reusing existing `users.reset_password_token` and `users.reset_password_expires` fields, with configurable expiry hours read from `app_settings`. Generates either welcome (`/set-password`) or reset (`/reset-password`) links using `FRONTEND_URL`.

### Fixes Applied log
- Added `issuePasswordResetToken(userId, purpose)` to centralize token issuance and link generation.
- Implemented resilient parsing of `password_reset_expiry_hours` with a safe default of 2 hours and bounds checks.

### How Fixes Were Implemented
- Query `app_settings` for `password_reset_expiry_hours`, defaulting to 2 on errors/invalids.
- Generate a 32-byte hex token, compute expiry, and update `users.reset_password_token` and `users.reset_password_expires`.
- Build a link using `FRONTEND_URL` and purpose-specific path (`/set-password` or `/reset-password`). 


