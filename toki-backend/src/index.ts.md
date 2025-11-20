# File: index.ts

### Summary
This file is the main entry point for the Toki backend server. It sets up Express, WebSocket (Socket.IO), middleware, routes, and error handling. It also handles WebSocket connections and room management for real-time messaging.

### Fixes Applied log
- Added: User activity logging for WebSocket connections and disconnections

### How Fixes Were Implemented
- Imported `pool` from database config to enable activity logging
- Added `currentUserId` tracking per socket connection to identify user on disconnect
- In `join-user` handler: Logs 'connect' event to `user_activity_logs` table when user joins their personal room
- In `disconnect` handler: Logs 'disconnect' event to `user_activity_logs` table if user ID is available
- Added error handling to ensure connection/disconnection proceeds even if activity logging fails
- Activity logging is non-blocking and doesn't affect WebSocket functionality
