# File: toki-backend/src/utils/push.ts

### Summary
Shared utility for sending push notifications to multiple users via Expo Push Notification service. Fetches tokens from database, validates Expo format, and sends in chunks.

### Fixes Applied log
- problem: No reusable function to send push notifications to users.
- solution: Created `sendPushToUsers` that accepts user IDs array and payload, queries tokens, filters valid Expo tokens, and sends via Expo SDK in chunks.

### How Fixes Were Implemented
- Queries `push_tokens` table for all tokens belonging to provided user IDs.
- Filters tokens using `Expo.isExpoPushToken` to ensure valid format.
- Creates messages with title, body, sound, and data payload.
- Uses `expo.chunkPushNotifications` and `expo.sendPushNotificationsAsync` to send in batches (Expo limit is 100 per request).

