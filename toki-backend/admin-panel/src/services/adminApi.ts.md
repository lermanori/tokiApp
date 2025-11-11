# File: adminApi.ts

### Summary
Admin API client with JWT auth. Added settings methods for password link expiry and an endpoint to issue welcome/reset password links for users.

### Fixes Applied log
- Added `getPasswordExpiry()` and `updatePasswordExpiry(hours)` to manage expiry settings.
- Added `issuePasswordLink(userId, purpose, send)` for generating and optionally emailing password links.

### How Fixes Were Implemented
- New functions that call `/api/admin/settings/password-reset-expiry` and `/api/admin/users/:id/password-link` with appropriate HTTP methods and payloads. 

### Summary
Extends admin API client with waitlist CRUD methods: create, update, delete entries.

### Fixes Applied log
- Added `createWaitlistEntry(data)` → POST `/api/admin/waitlist`
- Added `updateWaitlistEntry(id, data)` → PUT `/api/admin/waitlist/:id`
- Added `deleteWaitlistEntry(id)` → DELETE `/api/admin/waitlist/:id`

### How Fixes Were Implemented
- Reused shared `getAuthHeaders` and `handleResponse`.
- Ensured JSON bodies and Authorization headers are sent.
- Allowed partial payloads for update; created strongly-typed method signatures.


