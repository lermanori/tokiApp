# File: utils/categories.ts

### Summary
Defines the canonical Toki category list (12 items) shared across the app, and exports a color palette per category. Also provides placeholders for icon maps to be wired when assets are added.

### Fixes Applied log
- problem: Categories were hard-coded in multiple places (filters, form, maps) causing inconsistency.
- solution: Introduced a single `CATEGORIES` source of truth and `CATEGORY_COLORS` for reuse across components.

### How Fixes Were Implemented
- Created `CATEGORIES` with 12 canonical keys: `sports, coffee, music, food, work, art, nature, drinks, social, wellness, culture, morning`.
- Added `CATEGORY_COLORS` for uniform map markers and badges.
- Exported empty `CATEGORY_ICONS` structure to be populated when icon assets are added.
