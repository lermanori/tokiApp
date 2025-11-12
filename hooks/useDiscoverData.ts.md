# File: hooks/useDiscoverData.ts

### Summary
Custom hook for managing discover screen data including nearby tokis loading, pagination, map region, and user connections.

### Fixes Applied log

- **problem**: Default radius was set to 10km instead of 500km, causing the map to only show tokis within 10km instead of the full 500km default
- **solution**: Changed default radius from 10km to 500km in both the radius parsing logic and the initial load call. Now matches the backend default and filter default of 500km.

### How Fixes Were Implemented

1. **Default Radius Update**:
   - Changed `parseFloat(radius || '10') || 10` to `parseFloat(radius || '500') || 500`
   - Updated initial load to explicitly pass '500' as radius parameter
   - Ensures consistency with backend default (500km) and filter default

2. **Initial Load**:
   - Initial load now explicitly passes '500' as radius to ensure it uses the correct default
   - Matches the selectedFilters.radius default value from useDiscoverFilters
