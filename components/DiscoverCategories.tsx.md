# File: components/DiscoverCategories.tsx

### Summary
Horizontal category chips used on Discover screens. Now supports multi-select categories with an "All" shortcut.

### Fixes Applied log
- problem: Only one category could be selected at a time.
- solution: Props changed to accept `selectedCategories: string[]` and an `onCategoryToggle(next: string[])` callback. Tapping chips toggles membership; tapping "All" resets to `['all']`.

### How Fixes Were Implemented
- Added local `handlePress` to toggle categories and normalize the "all" behavior.
- Active state now checks inclusion in `selectedCategories` (or `'all'` presence) instead of equality against a single string.

