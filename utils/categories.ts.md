# File: utils/categories.ts

### Summary
Defines the canonical Toki category list (12 items) shared across the app, and exports a color palette per category. Also provides placeholders for icon maps to be wired when assets are added.

### Fixes Applied log
- problem: Categories were hard-coded in multiple places (filters, form, maps) causing inconsistency.
- solution: Introduced a single `CATEGORIES` source of truth and `CATEGORY_COLORS` for reuse across components.
- problem: User wanted to change category name from 'food' to 'dinner'.
- solution: Updated all category references across the entire codebase to use 'dinner' instead of 'food'.
- problem: User wanted to change category name from 'art' to 'culture'.
- solution: Updated all category references across the entire codebase to use 'culture' instead of 'art'.
- problem: User wanted to change category name from 'social' to 'party'.
- solution: Updated all category references across the entire codebase to use 'party' instead of 'social'.
- problem: User wanted to add a new 'chill' category for relaxed, casual activities.
- solution: Added 'chill' category with appropriate icon, color, and photo mappings across all files.

### How Fixes Were Implemented
- Created `CATEGORIES` with 12 canonical keys: `sports, coffee, music, dinner, work, culture, nature, drinks, party, wellness, chill, morning`.
- Added `CATEGORY_COLORS` for uniform map markers and badges.
- Exported empty `CATEGORY_ICONS` structure to be populated when icon assets are added.
- Updated category name from 'food' to 'dinner' across all files:
  - `utils/categories.ts` - Main category definitions and color mappings
  - `toki-backend/src/routes/tokis.ts` - Backend API categories
  - `utils/activityPhotos.ts` - Photo mappings
  - `components/TokiIcon.tsx` - Icon mappings
  - `contexts/AppContext.tsx` - Legacy photo mappings
  - `app/my-tokis.tsx` - Duplicate photo mappings
  - `components/TokiForm.tsx` - Form emoji and label mappings
  - `components/TokiCard.tsx` - Card emoji and label mappings
  - `app/toki-details.tsx` - Details emoji and label mappings