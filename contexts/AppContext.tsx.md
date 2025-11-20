# File: contexts/AppContext.tsx

### Summary
Centralized state management using Context API and useReducer. Handles all app data including notifications, connections, saved tokis, and real-time WebSocket updates.

### Fixes Applied log
- problem: Newly created Tokis showed placeholder image/time/distance until the Discover screen refreshed.
- solution: Reused the enriched backend payload from `createToki` and normalized it (including distance helper + coordinates) before dispatching `ADD_TOKI`, so cards render with final data immediately.
- problem: Notifications required manual refresh to see new ones. No real-time updates via WebSocket.
- solution: Added WebSocket listener for notifications in `setupGlobalMessageListeners()` that automatically updates state when new notifications arrive.
- problem: `loadTokis()` function didn't update `totalNearbyCount` in central state, causing discover screen to show incorrect count (20 instead of 32) when refreshing from profile.
- solution: Added pagination total extraction and `SET_TOTAL_NEARBY_COUNT` dispatch in `loadTokis()` to match `loadNearbyTokis()` behavior, ensuring unified state updates across all refresh paths.

### How Fixes Were Implemented
- Added a shared `formatDistanceString()` helper to safely convert backend distance objects/strings into the legacy `'<n> km'` string used throughout state.
- Updated all API mapping code paths (`loadTokis`, `loadMyTokis`, `loadTokisWithFilters`, `loadNearbyTokis`, `createToki`) to call the helper, ensuring consistent formatting for both fetched and newly created Tokis.
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
- problem: App was making authenticated API calls (getSavedTokis, getConnections, getPendingConnections) even when tokens were empty, causing 401 errors. This happened because `loadInitialAppData` only checked `state.currentUser?.id` (which could exist from stored data) but didn't verify if user actually had valid tokens.
- solution: Updated `loadInitialAppData` to also check `apiService.hasToken()` before making authenticated API calls. Added warning log when user data exists but no tokens are present. This prevents unnecessary 401 errors and API calls when user is not actually authenticated.
- problem: Nearby map and card views only ever had 50 results because the backend limit was hard coded, making the “Tokis nearby” header and map inaccurate for larger datasets.
- solution: Added a dedicated `mapTokis` slice in context and bumped `loadNearbyTokis()` to request a much larger limit (1,000 per call). Reducer paths now keep `mapTokis` in sync with `tokis`, so the UI can render all markers while paginating cards on the client.
- Added `mapTokis` to `AppState`, initialized it alongside `tokis`, and updated reducer cases (`SET_TOKIS`, `ADD_TOKI`, `UPDATE_TOKI`, `DELETE_TOKI`) to keep both arrays synchronized so downstream hooks can target map-specific data.
- Introduced `NEARBY_FETCH_LIMIT` (1,000) and optional `limit` parameter wired through `loadNearbyTokis()` → `apiService.getNearbyTokis()`, ensuring we fetch the entire dataset once while still capturing pagination totals for the UI header.
- problem: Relevance sorting was not working because `algorithmScore` field from API response was not being passed through to frontend `Toki` objects.
- solution: Added `algorithmScore?: number | null;` to `Toki` interface and included `algorithmScore: apiToki.algorithmScore ?? null` in all three mapping functions (`loadTokis`, `loadTokisWithFilters`, `loadNearbyTokis`) to preserve the algorithm score from API responses. This enables proper relevance sorting in the frontend.
