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

- **problem**: Count mismatch between API total count and actual loaded tokis (showing 31 instead of 33), sometimes loading only 20 items, and loading state getting stuck
- **solution**: Added comprehensive error handling, logging for debugging count mismatches, and improved error recovery to ensure loading state always clears

- **problem**: Default radius was 10km instead of 500km, causing map to only show nearby tokis within 10km
- **solution**: Changed default radius from 10 to 500 in loadNearbyTokis to match backend default and filter settings

- **problem**: No way for components to manually control loading state (needed for image loading tracking)
- **solution**: Added `setLoading` action to allow components to control loading state, enabling image loading tracking to keep loading state active until images finish loading

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

**2025-01-XX - Improved error handling and debugging for toki loading**

1. **Error Handling Improvements**:
   - Wrapped `getCurrentUser()` call in try-catch to prevent failures from blocking toki loading
   - Added fallback for pagination response structure to handle edge cases
   - Ensured loading state always clears in finally block

2. **Debugging and Logging**:
   - Added logging for API response including tokis count, pagination info, and page/limit
   - Added count comparison logging to track totalFromAPI vs actualTokisLoaded
   - Added warning logs for invalid total count values
   - Logs include append mode, hasMore status, and page number for better debugging

3. **Count Validation**:
   - Added validation to check if total count is a valid number before updating state
   - Allows 0 as a valid count value (no tokis found)
   - Warns when invalid count is received from API
