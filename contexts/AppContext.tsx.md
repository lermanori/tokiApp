# File: contexts/AppContext.tsx

### Summary
This file contains the global app context and state management. Added support for loading nearby tokis with pagination and tracking total nearby count.

### Fixes Applied log
- problem: No way to load nearby tokis with pagination or track total count of nearby tokis.
- solution: Added `totalNearbyCount` state field, created `loadNearbyTokis` action that supports pagination with append mode, and added SET_TOTAL_NEARBY_COUNT action type.
- problem: Debug logs and console statements cluttering the code.
- solution: Removed all debug console.log statements and debug UI elements from loadNearbyTokis function and reducer.
- problem: On app initialization, `loadTokis()` was being called which made a request to `/tokis` API instead of `/tokis/nearby`, causing unnecessary API calls on the Explore page.
- solution: Removed `loadTokis()` call from `loadInitialData` function. Individual screens (Explore/Discover) now load nearby tokis when they mount using `loadNearbyTokis()`.
- problem: Map was only showing 20 tokis, limiting visibility of nearby events.
- solution: Increased the limit parameter in `loadNearbyTokis` from 20 to 50 to show more tokis on the map.

### How Fixes Were Implemented
- Added `totalNearbyCount: number` to AppState interface and initialState
- Added `SET_TOTAL_NEARBY_COUNT` action type and reducer case
- Created `loadNearbyTokis` action function that:
  - Accepts params: `{ latitude, longitude, radius?, page?, category?, timeSlot? }` and `append` boolean
  - Calls `apiService.getNearbyTokis()` with page parameter
  - If `append=true`, appends to existing tokis (avoiding duplicates); otherwise replaces
  - Updates `totalNearbyCount` state with pagination total
  - Returns pagination metadata
- Added `loadNearbyTokis` to actions interface and actions object
