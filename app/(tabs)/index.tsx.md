# File: app/(tabs)/index.tsx

### Summary
This file contains the Explore screen (list view) showing nearby tokis. Implemented infinite scroll pagination and displays total count of nearby tokis.

### Fixes Applied log
- problem: Screen loaded all tokis at once, showed only loaded count instead of total, and had no infinite scroll.
- solution: Replaced `loadTokis()` with `loadNearbyTokis()`, added pagination state management, implemented infinite scroll detection, and updated display to show total count.
- problem: Debug UI elements visible in development mode.
- solution: Removed debug Text component that displayed state values.
- problem: Infinite scroll was triggering too late (only 200px from bottom), causing a less smooth scrolling experience.
- solution: Increased infinite scroll threshold to 500px for `onScroll` and 300px for `onMomentumScrollEnd`, so loading starts earlier and feels more seamless.
- problem: Infinite scroll based on pixel distance wasn't smooth enough - users could still hit the bottom before next page loaded.
- solution: Changed to item-based trigger: calculates average item height and triggers loading after user scrolls through 10 items (half of the 20-item page). This ensures the next page loads seamlessly before reaching the bottom.
- problem: Infinite scroll worked on web but not on iOS - required reaching the bottom before loading next page.
- solution: Added iOS-specific fixes: changed `scrollEventThrottle` from 16 to 1 for more frequent events, and added `onScrollEndDrag` handler which fires when user lifts finger (more reliable on iOS). Now uses three triggers: `onScroll`, `onScrollEndDrag`, and `onMomentumScrollEnd` for comprehensive coverage.
- problem: ScrollView-based infinite scroll was unreliable on iOS despite multiple event handlers.
- solution: Migrated from `Animated.ScrollView` to `FlatList` which has built-in `onEndReached` prop that's more reliable on iOS. Uses `onEndReachedThreshold={0.5}` to trigger loading when user is 50% from bottom (equivalent to ~10 items). Added performance optimizations: `removeClippedSubviews`, `maxToRenderPerBatch`, `windowSize`, and `initialNumToRender`. Restructured UI into `ListHeaderComponent`, `ListEmptyComponent`, and `ListFooterComponent` for better organization.

### How Fixes Were Implemented
- Added state: `currentPage`, `isLoadingMore`, `hasMore`
- Replaced `actions.loadTokis()` with `actions.loadNearbyTokis()` using user's latitude/longitude
- Created `loadNearbyTokis` function that calls action with page parameter and append flag
- Added `handleLoadMore` function to load next page when scrolling to bottom
- Implemented infinite scroll using `onScrollEndDrag` event on `Animated.ScrollView`
- Updated display: changed `{filteredTokis.length}` to `{state.totalNearbyCount}` to show total count
- Added "Loading more..." indicator when `isLoadingMore` is true
- Updated refresh handler to reset to page 1
