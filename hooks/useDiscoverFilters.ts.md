### Summary
Manages discover screen filter state and memoized filtering. Default radius updated to 500 km to cap results by default.

### Fixes Applied log
- problem: Default radius limited to 10 km, not matching desired 500 km default.
- solution: Set `DEFAULT_FILTERS.radius` from `'10'` to `'500'`.

### How Fixes Were Implemented
- Updated the `DEFAULT_FILTERS` initialization to use `'500'` for `radius`. This ensures discover fetches and refresh actions use a 500 km radius by default, while UI controls can still clamp and adjust as needed.

# File: hooks/useDiscoverFilters.ts

### Summary
Hook that manages Discover filters, search query, and computes `filteredEvents`. Provides category selection state and helpers.

### Fixes Applied log
- problem: Category selection supported only a single value.
- solution: Switched to `selectedCategories: string[]` with `['all']` default, enabling multi-select category filtering.

### How Fixes Were Implemented
- Updated state from `selectedCategory: string` to `selectedCategories: string[]`.
- Adjusted filtering call to pass the category array into `filterEvents`.
- Reset logic now restores categories to `['all']`.

