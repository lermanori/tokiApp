# File: components/TokiFilters.tsx

### Summary
Filter modal for the Explore/Discover screen. Provides filtering options for visibility, category, distance, availability, participants, and time.

### Fixes Applied log
- problem: Category options were hard-coded and diverged from backend/DB values.
- solution: Replaced the hard-coded list with `['all', ...CATEGORIES]` from `utils/categories`.
- problem: Visibility filter included irrelevant "friends" option.
- solution: Removed "friends" from visibility options and added "hosted_by_me" option to filter events hosted by the current user.

### How Fixes Were Implemented
- Imported `CATEGORIES` from `utils/categories`.
- Updated the Category section options to spread the canonical list.
- Removed 'friends' from the visibility options array and replaced it with 'hosted_by_me'.
- Updated `getOptionLabel` function to display "Hosted by me" for the 'hosted_by_me' option.
