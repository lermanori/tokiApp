# File: app/(tabs)/index.tsx

### Summary
Explore screen listing nearby Tokis with search, category chips, filtering, and now client-side sorting via a dedicated Sort modal.

### Fixes Applied log
- problem: Users could not change the ordering of results, only filter them.
- solution: Integrated `TokiSortModal` and applied a memoized sorted array derived from the filtered list.

### How Fixes Were Implemented
- Added `showSortModal` and `sort` state, plus a new button next to Filters in the header.
- Computed `sortedTokis` using `sortEvents(list, sort, userLat, userLng)` and fed it to the `FlatList`.
- Included a `TokiSortModal` instance to change sort options; Apply closes the modal and reorders the list.

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
- problem: FlatList change broke the grid layout on desktop - cards displayed in a single column instead of a responsive grid.
- solution: Added responsive grid support using `numColumns` prop on FlatList. Uses `useWindowDimensions()` hook for responsive width detection. Calculates columns dynamically up to 7 columns: 1 for mobile (<1200px), 2 for tablet/desktop (1200-1599px), 3 for desktop (1600-1999px), 4 for large desktop (2000-2399px), 5 for XL desktop (2400-2799px), 6 for XXL desktop (2800-3199px), 7 for ultra wide (≥3200px). Added `cardWrapperGrid` style that removes full width and uses flex layout when in grid mode. Made `contentContainerStyle` padding conditional - only adds horizontal padding when `numColumns > 1` to avoid double padding on mobile.
- problem: Web throws error "Changing numColumns on the fly is not supported" when screen width changes and columns update.
- solution: Added `key={`flatlist-${numColumns}`}` prop to FlatList component. This forces React to completely re-render the FlatList when `numColumns` changes, which is required for web compatibility. The key change triggers a fresh render, preventing the error.
- problem: Tokis count in header did not reflect current filters; it showed total nearby instead of filtered results.
- solution: Header title now uses `filteredTokis.length` to display a dynamic count that updates as filters/search/category change. When zero match, it shows "No Tokis nearby".
- problem: Category chips worked independently from modal category filter and were single-select.
- solution: Unified category filtering to use the chips as the single source of truth with multi-select (`['all']` resets). Reused `DiscoverCategories` for consistent behavior with the map screen. Removed additive category check with modal filter.

### How Fixes Were Implemented
- Added state: `currentPage`, `isLoadingMore`, `hasMore`
- Replaced `actions.loadTokis()` with `actions.loadNearbyTokis()` using user's latitude/longitude
- Created `loadNearbyTokis` function that calls action with page parameter and append flag
- Added `handleLoadMore` function to load next page when scrolling to bottom
- Implemented infinite scroll using `onScrollEndDrag` event on `Animated.ScrollView`
- Updated display: changed header count logic to use `{filteredTokis.length}`; removed fallback to total count when filters are applied
- Added "Loading more..." indicator when `isLoadingMore` is true
- Updated refresh handler to reset to page 1
- Replaced static `Dimensions.get('window')` with `useWindowDimensions()` hook for responsive width
- Added `numColumns` calculation based on screen width using `React.useMemo`
- Added `numColumns` prop to FlatList for grid layout
- Added `key={`flatlist-${numColumns}`}` prop to FlatList to force re-render when columns change (required for web)
- Created `cardWrapperGrid` style with flex layout for multi-column display
- Made `contentContainerStyle` conditionally apply padding based on `numColumns`
- Introduced `selectedCategories: string[]` with `setSelectedCategories` and wired to `DiscoverCategories`. Category filter logic now checks inclusion in the selected array and ignores modal category to avoid additive filtering.
- problem: Double border under category chips in Explore after reusing `DiscoverCategories`.
- solution: Removed bottom border from Explore’s `categoriesContainer` (the shared `DiscoverCategories` already draws the divider).
