# File: utils/discoverHelpers.ts

### Summary
Helpers for Discover screens: data transform and filtering utilities for Tokis.

### Fixes Applied log
- problem: `filterEvents` only allowed a single selected category.
- solution: Updated function signature to accept `selectedCategories: string[]` and matched events if category is in the array; `['all']` means no category constraint. The modal category option is ignored to prevent additive filtering.
- problem: Map/Explore headers were not reflecting filtered counts.
- solution: With multi-category support, filtered lists drive the counts in the screens.
- problem: Category filter only checked the primary `event.category` field, ignoring the `tags` array which can contain up to 3 categories per Toki.
- solution: Updated `matchesMultiCategory` to check if any selected category matches any tag in `event.tags` array using `selectedCategories.some(selectedCat => event.tags.includes(selectedCat))`, allowing Tokis to match when any of their tags (up to 3) match the selected categories.
- problem: `createdAt` field from API was not being passed through in `transformTokiToEvent`, causing creation date sorting to fail.
- solution: Added `createdAt: toki.createdAt` to the return object in `transformTokiToEvent` function to preserve the creation date from API responses.

### How Fixes Were Implemented
- Introduced `matchesMultiCategory` which treats empty or `['all']` as no-op and otherwise checks inclusion using `selectedCategories.includes(event.category)`.
- Updated `matchesMultiCategory` to check against `event.tags` array instead of just `event.category`, enabling multi-category filtering (up to 3 categories per Toki).
- Left other filter predicates unchanged.

