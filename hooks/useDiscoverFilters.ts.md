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

