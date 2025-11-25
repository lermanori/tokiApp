# File: toki-backend/src/index.ts

### Summary
Main server entry point that initializes Express app, WebSocket server, routes, and now includes notification scheduler startup.

### Fixes Applied log
- problem: Notification scheduler was not being started on server startup.
- solution: Imported and called startNotificationScheduler() after database connection is established.
- problem: API version references outdated in health check and API info endpoints.
- solution: Updated version from '1.0.0' to '1.0.12' in both health check endpoint and main API endpoint response.

### How Fixes Were Implemented
- Added import for startNotificationScheduler from services/notificationScheduler.
- Called startNotificationScheduler() in server startup after database connection and timezone setup.
- Ensures scheduler starts automatically when backend server starts.
- Updated version string in /health endpoint response from '1.0.0' to '1.0.12'.
- Updated version string in /api endpoint response from '1.0.0' to '1.0.12'.
