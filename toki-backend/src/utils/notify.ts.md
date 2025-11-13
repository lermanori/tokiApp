# File: toki-backend/src/utils/notify.ts

### Summary
Helper to atomically create system notification (insert into `notifications` table), send push notification, and emit WebSocket event. Uses same pattern as chat messages - gets io from req.app.get('io') and passes it as parameter.

### Fixes Applied log
- problem: System notifications and push notifications were created separately, risking inconsistency. No real-time WebSocket updates. Used global ioInstance which wasn't working.
- solution: Updated to accept `io` as optional parameter (same pattern as chat messages), use logger for consistent logging, and removed global ioInstance approach.

### How Fixes Were Implemented
- Removed global `ioInstance` and `setIoInstance()` function.
- Added `io?: Server` as optional parameter to `SystemNotificationInput`.
- Updated to use `logger` instead of `console.log` for consistent logging.
- Matches chat message pattern: `logger.info('📤 [BACKEND] SENDING EVENT: notification-received')`, logs room members, and emits to room.
- All call sites now pass `io: req.app.get('io')` to match chat message pattern.
- Used for invite, invite_accepted, and participant_joined notifications.
