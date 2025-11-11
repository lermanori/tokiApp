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


