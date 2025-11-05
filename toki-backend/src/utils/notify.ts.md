# File: toki-backend/src/utils/notify.ts

### Summary
Helper to atomically create system notification (insert into `notifications` table) and send push notification. Ensures both in-app and push notifications are sent together.

### Fixes Applied log
- problem: System notifications and push notifications were created separately, risking inconsistency.
- solution: Created `createSystemNotificationAndPush` that inserts notification row and triggers push in one call.

### How Fixes Were Implemented
- Accepts `SystemNotificationInput` with userId, type, title, message, relatedTokiId, relatedUserId, and optional pushData.
- Inserts into `notifications` table with read=false.
- Calls `sendPushToUsers` with same title/body and enriched data payload (includes type, tokiId, userId, and any pushData).
- Used for invite and invite_accepted notifications that are stored in system table.

