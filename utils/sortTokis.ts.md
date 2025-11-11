# File: utils/sortTokis.ts

### Summary
Pure helpers to order Toki events given a `SortState`. Includes a small Haversine calculator for distance sorting.

### Fixes Applied log
- problem: No centralized, reusable sorting logic across Explore and Discover.
- solution: Implemented `sortEvents` that supports Relevance (no-op), Date, Distance, Popularity, Created, and Title.

### How Fixes Were Implemented
- Added `sortEvents(list, sort, userLat, userLng)` that clones the list and sorts deterministically.
- Included `haversineKm` for accurate nearest-first ordering when user or map coordinates are available.


