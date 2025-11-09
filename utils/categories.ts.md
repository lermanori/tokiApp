# File: utils/categories.ts

### Summary
Defines the canonical Toki category list (15 items) as a SINGLE SOURCE OF TRUTH shared across the app. All category metadata (emoji, label, color, photo, icons) is centralized in the `CATEGORY_CONFIG` object. Helper functions provide easy access to category data throughout the application.

### Fixes Applied log
- problem: Categories were hard-coded in multiple places (filters, form, maps) causing inconsistency.
- solution: Introduced a single `CATEGORY_CONFIG` source of truth and helper functions for reuse across components.
- problem: User wanted to change category name from 'food' to 'dinner'.
- solution: Updated all category references across the entire codebase to use 'dinner' instead of 'food'.
- problem: User wanted to change category name from 'art' to 'culture'.
- solution: Updated all category references across the entire codebase to use 'culture' instead of 'art'.
- problem: User wanted to change category name from 'social' to 'party'.
- solution: Updated all category references across the entire codebase to use 'party' instead of 'social'.
- problem: User wanted to add a new 'chill' category for relaxed, casual activities.
- solution: Added 'chill' category with appropriate icon, color, and photo mappings across all files.
- problem: Category data was scattered across multiple files with duplicate switch statements, making it difficult to add new categories.
- solution: Centralized all category metadata in `CATEGORY_CONFIG` object. All other files now import helper functions from this single source.
- problem: User wanted to add 3 new categories: shopping, education, and film.
- solution: Added shopping (🛍️), education (📚), and film (🎬) categories to `CATEGORY_CONFIG` in both frontend and backend config files.

### How Fixes Were Implemented
- Created `CATEGORY_CONFIG` with 15 canonical categories containing all metadata: `id`, `name`, `emoji`, `description`, `color`, `photoUrl`, `iconAsset`, `iconWeb`.
- Added helper functions: `getCategoryEmoji()`, `getCategoryLabel()`, `getCategoryColor()`, `getCategoryPhoto()`, `getCategoryDescription()`, `getCategoriesForAPI()`.
- Derived existing exports from config: `CATEGORIES` array, `CATEGORY_COLORS`, `CATEGORY_ICONS`, `CATEGORY_ICON_WEB`.
- Updated all files to use centralized helpers:
  - `utils/activityPhotos.ts` - Now uses `getCategoryPhoto()`
  - `utils/tokiUtils.ts` - Re-exports `getCategoryEmoji()` and `getCategoryLabel()`
  - `components/TokiForm.tsx` - Removed duplicate functions, imports from tokiUtils
  - `components/TokiCard.tsx` - Removed duplicate functions, imports from categories
  - `app/(tabs)/index.tsx` - Uses `CATEGORIES` array and `getCategoryColor()`
  - `app/(tabs)/discover.tsx` - Uses `CATEGORIES` array and `getCategoryColor()`
  - `toki-backend/src/routes/tokis.ts` - Uses `getCategoriesForAPI()` from shared config
  - `toki-backend/src/config/categories.ts` - Created shared backend config matching frontend structure

### How to Add New Categories
To add a new category, simply add an entry to the `CATEGORY_CONFIG` object in `utils/categories.ts`:

```typescript
newCategory: {
  id: 'newCategory',
  name: 'New Category',
  emoji: '🎯',
  description: 'Description of the new category',
  color: '#HEXCOLOR',
  photoUrl: 'https://...',
  iconAsset: 'iconName',
  iconWeb: '/assets/emojis/iconName.png',
},
```

Also add the same entry to `toki-backend/src/config/categories.ts` (without `iconAsset` and `iconWeb` fields).

That's it! The category will automatically be available everywhere in the app.
