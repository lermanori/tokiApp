# File: contexts/AppContext.tsx

### Summary
Centralized state management using Context API and useReducer. Handles all app data including notifications, connections, saved tokis, and real-time WebSocket updates.

### Fixes Applied log
- problem: Notifications required manual refresh to see new ones. No real-time updates via WebSocket.
- solution: Added WebSocket listener for notifications in `setupGlobalMessageListeners()` that automatically updates state when new notifications arrive.

### How Fixes Were Implemented
- Added `socketService.offNotificationReceived()` to cleanup in `setupGlobalMessageListeners()`.
- Added `socketService.onNotificationReceived()` listener that:
  - Transforms backend notification format to frontend format
  - Adds new notification to beginning of notifications list
  - Dispatches `SET_NOTIFICATIONS` action (reducer automatically recalculates unread count)
  - Only processes notifications for current user
- Notifications now appear instantly without refresh, and badge count updates automatically.
