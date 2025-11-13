# File: contexts/AppContext.tsx

### Summary
Centralized state management using Context API and useReducer. Handles all app data including notifications, connections, saved tokis, and real-time WebSocket updates.

### Fixes Applied log
- problem: Notifications required manual refresh to see new ones. No real-time updates via WebSocket.
- solution: Added WebSocket listener for notifications in `setupGlobalMessageListeners()` that automatically updates state when new notifications arrive.
- problem: `loadTokis()` function didn't update `totalNearbyCount` in central state, causing discover screen to show incorrect count (20 instead of 32) when refreshing from profile.
- solution: Added pagination total extraction and `SET_TOTAL_NEARBY_COUNT` dispatch in `loadTokis()` to match `loadNearbyTokis()` behavior, ensuring unified state updates across all refresh paths.

### How Fixes Were Implemented
- Added `socketService.offNotificationReceived()` to cleanup in `setupGlobalMessageListeners()`.
- Added `socketService.onNotificationReceived()` listener that:
  - Transforms backend notification format to frontend format
  - Adds new notification to beginning of notifications list
  - Dispatches `SET_NOTIFICATIONS` action (reducer automatically recalculates unread count)
  - Only processes notifications for current user
- Notifications now appear instantly without refresh, and badge count updates automatically.
- Updated `loadTokis()` function to extract pagination total from API response (handles both `response.pagination` and `response.data.pagination` structures).
- Added `SET_TOTAL_NEARBY_COUNT` dispatch when total is valid (>= 0), ensuring discover screen always shows correct count regardless of which refresh path is used.
- problem: Multiple identical requests to `/api/tokis/nearby` were being made (3 GET + 1 OPTIONS instead of 1 GET + 1 OPTIONS), likely due to React strict mode double renders and lack of proper request deduplication.
- solution: Added `nearbyRequestRef` to track in-flight requests with their parameters. `loadNearbyTokis()` now detects duplicate requests with identical parameters and returns the existing promise instead of making a new API call. This reduces network requests from 3+ to just 1 per unique request.
- Implementation details:
  - Added `useRef` import and `nearbyRequestRef` to track `{ params: string, promise: Promise }` for in-flight requests
  - Created `requestKey` by JSON.stringify of request parameters (lat, lng, radius, page, category, timeSlot, append)
  - Before making API call, check if `nearbyRequestRef.current` exists with matching `requestKey` - if so, return existing promise
  - Store promise in ref before making request (only for non-append requests)
  - Clear ref when promise resolves/rejects using `.finally()`
  - This ensures identical concurrent requests share the same promise and API call
- problem: Tokis were loading but then disappearing after a second, likely due to empty responses overwriting existing tokis or invalid response structures.
- solution: Added safety checks in `loadNearbyTokis()` to: (1) validate response structure (handles both `response.tokis` and `response.data.tokis`), (2) prevent overwriting existing tokis with empty arrays unless it's the initial load, (3) return early if response is invalid without clearing existing tokis. This ensures tokis persist even if subsequent requests fail or return empty.
- problem: Multiple concurrent calls to `loadCurrentUser()` were causing 6+ simultaneous `/auth/me` API calls on app refresh, leading to unnecessary network traffic and server load.
- solution: Added request deduplication using `pendingLoadCurrentUserRef` to track in-flight requests. When `loadCurrentUser()` is called multiple times concurrently, subsequent calls reuse the existing promise instead of making new API calls. This reduces concurrent `/auth/me` calls from 6+ to just 1 per refresh cycle.
- Implementation details:
  - Added `pendingLoadCurrentUserRef` using `useRef<Promise<void> | null>`
  - Before making API call, check if `pendingLoadCurrentUserRef.current` exists - if so, return existing promise
  - Store promise in ref before making request
  - Clear ref when promise resolves/rejects using `.finally()`
  - Works in conjunction with API service's `getCurrentUser()` deduplication for double protection
