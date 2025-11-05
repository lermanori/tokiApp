# File: toki-details.tsx

### Summary
This file implements the Toki details screen, displaying comprehensive information about a specific Toki event including participants, host details, and event metadata.

### Fixes Applied log
- **Problem**: Timezone conversion issue causing 2-hour difference between input time and display time
- **Solution**: Added `timeZone: 'UTC'` to `toLocaleTimeString` options to display time in UTC, matching the input time format
- **Problem**: Distance was hardcoded as "0.5 km" instead of using the actual calculated distance, causing inconsistency with card display
- **Solution**: Updated to get distance from `state.tokis` first (matching card display), with fallback to API response, and use shared `formatDistanceDisplay` utility
- **Problem**: After creating a toki, pressing back in details would return to create screen instead of home screen
- **Solution**: Added support for `fromCreate` parameter to redirect to home screen when coming from create flow (same as `fromEdit` behavior)
- **Problem**: Distance (km) was not updated when navigating to toki details, only when going back to homepage. After creating a toki, it showed "0.0 km" instead of the actual distance.
- **Solution**: Backend now calculates distance when fetching a single toki, and frontend prioritizes API distance over state

### How Fixes Were Implemented
- **Problem**: The `formatTimeDisplay` function was converting UTC time to local timezone for display
- **Solution**: Modified `toLocaleTimeString` call to include `timeZone: 'UTC'` parameter, ensuring the displayed time matches the input time (16:15 → 4:15 PM instead of 6:15 PM)
- **Backend Integration**: Updated backend to return `scheduledTime` in UTC format (`YYYY-MM-DD HH:MM`)
- **Date Parsing**: Enhanced date parsing to treat backend timestamps as UTC by adding 'Z' suffix
- **Problem**: Distance display inconsistency between card and details page
- **Solution**: 
  - Updated `distance` field in `transformedToki` to prioritize distance from `state.tokis` (which matches what the card shows)
  - Changed hardcoded "0.5 km away" to use `formatDistanceDisplay(toki.distance)` for consistent formatting
  - Updated `TokiDetails` interface to allow distance as string or object `{km, miles}`
  - Imported shared `formatDistanceDisplay` utility from `@/utils/distance`
- **Problem**: Back navigation after creating a toki would return user to create screen instead of home
- **Solution**:
  - Added `fromCreate` variable to read `params.fromCreate === 'true'` (similar to existing `fromEdit`)
  - Updated back button handlers in both error state and main header to check `if (fromEdit || fromCreate)` and redirect to `/(tabs)` instead of calling `router.back()`
  - This ensures consistent navigation behavior: after creating or editing a toki, pressing back takes user to home screen rather than back to the form
- **Problem**: Distance was not recalculated when loading toki details, only using stale data from `state.tokis` or missing if not in state. After creating a toki, distance showed "0.0 km" until navigating back and returning.
- **Solution**:
  - **Backend**: Updated single toki GET endpoint (`/api/tokis/:id`) to calculate distance server-side:
    - Gets user's coordinates from database
    - Calculates distance in SQL query using Haversine formula (same as list endpoint)
    - Returns distance in response as `{km, miles}` object
  - **Frontend**: Updated distance calculation priority in `loadTokiData`:
    1. **Priority 1**: Use distance from API response (most accurate, always up-to-date from backend)
    2. **Priority 2**: Fallback to distance from `state.tokis` (matches card display)
    3. **Priority 3**: Calculate on client side if coordinates available but no distance provided
  - Imported `calculateDistance` function from `@/utils/distance` for client-side fallback
  - This ensures distance is always accurate immediately after creation, without needing to navigate away and back