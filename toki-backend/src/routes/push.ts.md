# File: toki-backend/src/routes/push.ts

### Summary
Backend API routes for push token registration/unregistration and test sending. Stores device tokens in `push_tokens` table for later push delivery.

### Fixes Applied log
- problem: No backend endpoint to register device push tokens or send test notifications.
- solution: Added POST `/api/push/register` to store tokens, POST `/api/push/unregister` to remove tokens, and POST `/api/push/send-test` for manual verification.

### How Fixes Were Implemented
- `/register`: upserts token with user_id, platform, and updated_at timestamp (ON CONFLICT updates existing token).
- `/unregister`: deletes token for user.
- `/send-test`: fetches user's tokens, validates Expo format, sends test notification, returns receipts.
- Uses `expo-server-sdk` for token validation and sending.

