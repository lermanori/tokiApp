# File: exMap.tsx

### Summary
This file contains the ExMap screen component that combines the Explore screen's header (with gradient, greeting, search, and categories) with the Map screen's extended controls (Refresh, Sort, Filter). The map is always visible at the top, followed by categories and the list of Tokis below.

### Fixes Applied log
- problem: Need to combine Explore and Map functionality into a single unified screen
- solution: Created new exMap.tsx that merges Explore header with Map extended controls, using useDiscoverData and useDiscoverFilters hooks for data management
- problem: White space gap between header and map creating visual disconnect
- solution: Implemented overlap technique using negative margins (-10px) to seamlessly connect header gradient with map container, added shadow for depth
- problem: Redundant refresh button in header controls when drag-to-refresh already provides the same functionality
- solution: Removed refresh button (RefreshCw icon) from extended controls and removed unused RefreshCw import, keeping only drag-to-refresh via RefreshControl on FlatList

### How Fixes Were Implemented
- problem: Users needed a single screen with both Explore's friendly header and Map's extended controls
- solution: 
  - Combined LinearGradient header from Explore with greeting text "Feeling social right now?" and subtitle
  - Added search bar with expandable input functionality on first line
  - Integrated extended controls (Refresh, Sort, Filter) from Map screen on second line - removed map/list toggle button as map is always visible
  - Map component always renders in FlatList ListHeaderComponent (no conditional rendering)
  - Used useDiscoverData and useDiscoverFilters hooks for consistent data management
  - Preserved all key features: map region management, highlight toki functionality, image loading tracking, infinite scroll, filter/sort modals, search, category selection, and responsive grid layout
- problem: Visual gap between gradient header and map created awkward white space
- solution: 
  - Reduced header paddingBottom from 30 to 20
  - Added marginBottom: -10 to header to pull content up
  - Added marginTop: -10 to mapContainer to create 10px overlap
  - Added shadow to mapContainer (shadowOpacity: 0.1, shadowRadius: 8, elevation: 5) for visual depth
  - Result: Seamless transition from gradient header to map with no white space
- problem: Refresh button in header was redundant since drag-to-refresh functionality already exists via RefreshControl
- solution: 
  - Removed TouchableOpacity containing RefreshCw icon from extendedControls View (lines 470-476)
  - Removed RefreshCw from lucide-react-native imports
  - Kept handleRefreshWithRadius function as it's still used by RefreshControl on FlatList
  - Result: Cleaner UI with no duplicate refresh functionality, users can still refresh via standard drag-to-refresh gesture
- problem: API limited responses to 50 items so the map and header were accurate but the UI still tried to fetch additional pages; cards also rendered all results at once with no true infinite scroll.
- solution: Switched to client-side pagination by slicing the sorted events list into 20-item pages, added local “load more” state, and wired map/filter logic to the new `mapEvents` dataset so markers still display every result.
- Added `mapEvents` from `useDiscoverData()` (falls back to `events`) so `useDiscoverFilters` and category counts always work on the full dataset even though the card list paginates locally.
- Introduced `CARD_PAGE_SIZE`, `visibleCount`, and `isLocalLoadingMore` states plus a derived `paginatedEvents` array. `handleLoadMoreLocal` increments the visible window when the user nears the bottom, while the map continues to consume the unsliced `sortedEvents`.
- Updated `FlatList` bindings (`data`, `ListFooterComponent`, scroll handlers) to rely on the local pagination helpers and removed the old backend-driven `handleLoadMoreWithRadius`.

