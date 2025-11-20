# File: services/socket.ts

### Summary
Socket service for WebSocket connection management. Handles connection, room joining, and event listeners for messages and notifications.

### Fixes Applied log
- problem: No WebSocket listener for real-time notifications.
- solution: Added `onNotificationReceived()` and `offNotificationReceived()` methods to listen for `notification-received` events.

### How Fixes Were Implemented
- Added `onNotificationReceived(callback)` method that sets up listener for `notification-received` events.
- Added `offNotificationReceived()` method to remove notification listener.
- Follows same pattern as `onMessageReceived()` and `onTokiMessageReceived()`.
- Logs debug information for troubleshooting.


