# File: app/(tabs)/discover.tsx

### Summary
This file contains the Discover screen (map view) showing nearby tokis on a map. Implemented infinite scroll pagination and displays total count of nearby tokis.

### Fixes Applied log
- problem: Screen loaded all tokis at once, showed only loaded count instead of total, and had no infinite scroll.
- solution: Replaced `loadTokis()` with `loadNearbyTokis()`, added pagination state management, implemented infinite scroll detection, and updated display to show total count.
- problem: Infinite scroll was triggering too late (only 200px from bottom), causing a less smooth scrolling experience.
- solution: Increased infinite scroll threshold to 500px for `onScroll` and 300px for `onMomentumScrollEnd`, so loading starts earlier and feels more seamless.
- problem: Infinite scroll based on pixel distance wasn't smooth enough - users could still hit the bottom before next page loaded.
- solution: Changed to item-based trigger: calculates average item height and triggers loading after user scrolls through 10 items (half of the 20-item page). This ensures the next page loads seamlessly before reaching the bottom.
- problem: Infinite scroll worked on web but not on iOS - required reaching the bottom before loading next page.
- solution: Added iOS-specific fixes: changed `scrollEventThrottle` from 16 to 1 for more frequent events, and added `onScrollEndDrag` handler which fires when user lifts finger (more reliable on iOS). Now uses three triggers: `onScroll`, `onScrollEndDrag`, and `onMomentumScrollEnd` for comprehensive coverage.

### How Fixes Were Implemented
- Added state: `currentPage`, `isLoadingMore`, `hasMore`
- Replaced `actions.loadTokis()` with `actions.loadNearbyTokis()` using user's latitude/longitude or mapRegion as fallback
- Created `loadNearbyTokis` function that accepts optional lat/lng parameters and uses selectedFilters.radius
- Added `handleLoadMore` function to load next page when scrolling to bottom
- Implemented infinite scroll using `onScrollEndDrag` event on `ScrollView`
- Updated display: changed `{filteredEvents.length}` to `{state.totalNearbyCount}` to show total count
- Added "Loading more..." indicator when `isLoadingMore` is true
- Updated refresh handler to reset to page 1
- Map markers automatically show all loaded tokis from pagination
