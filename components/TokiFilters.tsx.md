# File: components/TokiFilters.tsx

### Summary
Filter modal for the Discover screen. Now uses the centralized `CATEGORIES` list for the Category filter options.

### Fixes Applied log
- problem: Category options were hard-coded and diverged from backend/DB values.
- solution: Replaced the hard-coded list with `['all', ...CATEGORIES]` from `utils/categories`.

### How Fixes Were Implemented
- Imported `CATEGORIES` from `utils/categories`.
- Updated the Category section options to spread the canonical list.
