# File: useDiscoverData.ts

### Summary
Custom hook for managing discover screen data including events, map region, user connections, pagination, and data loading. Handles transformation of backend Toki data to event format, map region initialization from user profile, and API calls for loading nearby Tokis.

### Fixes Applied log
- problem: Map region was being updated unnecessarily when user profile location was geocoded, causing map flickering even when the location was very close to the default region.
- solution: Added check to only update map region if the difference between the geocoded location and current region is significant (> 0.01 degrees, approximately 1km). This prevents unnecessary map updates when the location is close to the default region. Also removed `mapRegion` from useEffect dependencies to avoid dependency loops.

### How Fixes Were Implemented
- problem: `setMapRegion` was being called even when the geocoded location was very close to the default region, causing unnecessary map updates
- solution: Before calling `setMapRegion`, calculate the difference between geocoded coordinates and current map region. Only update if `latDiff > 0.01 || lngDiff > 0.01` (approximately 1km difference). This prevents flickering when the location is close to the default.

- problem: `mapRegion` was in the useEffect dependency array, which could cause dependency loops
- solution: Removed `mapRegion` from the dependency array and added eslint-disable comment. The effect only depends on `state.currentUser?.location` to avoid loops while still updating when the user's location changes.



