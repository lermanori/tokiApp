# File: components/DiscoverMap.web.tsx

### Summary
This file contains the web version of the DiscoverMap component that displays interactive maps with event markers using Leaflet.

### Fixes Applied log
- **Use categoryConfig for icons (single source of truth)**: Replaced ad-hoc emoji imports with URLs derived from `utils/categoryConfig.ts`.
- **Added category alias resolution**: Mapped legacy names (`social`, `food`, `celebration`, `art`) to config keys (`party`, `dinner`, `party`, `culture`) to avoid missing icons.

### How Fixes Were Implemented
- **Icon source of truth**: Imported `CATEGORY_CONFIG` and `getIconAsset` from `utils/categoryConfig.ts`. Built `ICON_WEB` via `Object.entries(CATEGORY_CONFIG)` and used `toUrl(getIconAsset(def.iconAsset))` (hashed web URL) with fallback to `def.iconWeb`.
- **Alias normalization**: Introduced `resolveCategoryKey()` to normalize legacy category names to config keys before indexing `ICON_WEB`.
- **Marker img src update**: Replaced `ICON_WEB[group.items[0].category]` with `ICON_WEB[resolveCategoryKey(group.items[0].category)]` to ensure correct lookups.