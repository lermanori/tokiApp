# File: toki-backend/src/index.ts

### Summary
Main server entry point that initializes Express app, WebSocket server, routes, and now includes notification scheduler startup.

### Fixes Applied log
- problem: Notification scheduler was not being started on server startup.
- solution: Imported and called startNotificationScheduler() after database connection is established.

### How Fixes Were Implemented
- Added import for startNotificationScheduler from services/notificationScheduler.
- Called startNotificationScheduler() in server startup after database connection and timezone setup.
- Ensures scheduler starts automatically when backend server starts.
