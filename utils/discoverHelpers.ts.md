# File: utils/discoverHelpers.ts

### Summary
Helpers for Discover screens: data transform and filtering utilities for Tokis.

### Fixes Applied log
- problem: `filterEvents` only allowed a single selected category.
- solution: Updated function signature to accept `selectedCategories: string[]` and matched events if category is in the array; `['all']` means no category constraint. The modal category option is ignored to prevent additive filtering.
- problem: Map/Explore headers were not reflecting filtered counts.
- solution: With multi-category support, filtered lists drive the counts in the screens.

### How Fixes Were Implemented
- Introduced `matchesMultiCategory` which treats empty or `['all']` as no-op and otherwise checks inclusion using `selectedCategories.includes(event.category)`.
- Left other filter predicates unchanged.

