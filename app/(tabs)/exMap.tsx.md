# File: exMap.tsx

### Summary
This file contains the ExMap screen component that combines the Explore screen's header (with gradient, greeting, search, and categories) with the Map screen's extended controls (Refresh, Sort, Filter). The map is always visible at the top, followed by categories and the list of Tokis below.

### Fixes Applied log
- problem: Need to combine Explore and Map functionality into a single unified screen
- solution: Created new exMap.tsx that merges Explore header with Map extended controls, using useDiscoverData and useDiscoverFilters hooks for data management

### How Fixes Were Implemented
- problem: Users needed a single screen with both Explore's friendly header and Map's extended controls
- solution: 
  - Combined LinearGradient header from Explore with greeting text "Feeling social right now?" and subtitle
  - Added search bar with expandable input functionality on first line
  - Integrated extended controls (Refresh, Sort, Filter) from Map screen on second line - removed map/list toggle button as map is always visible
  - Map component always renders in FlatList ListHeaderComponent (no conditional rendering)
  - Used useDiscoverData and useDiscoverFilters hooks for consistent data management
  - Preserved all key features: map region management, highlight toki functionality, image loading tracking, infinite scroll, filter/sort modals, search, category selection, and responsive grid layout

