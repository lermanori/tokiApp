# File: DiscoverMap.native.tsx

### Summary
This file contains the native map component (iOS/Android) using react-native-maps. It displays clustered event markers on a map, handles map region changes, and supports programmatically opening callouts when navigating from the Toki details page.

### Fixes Applied log
- problem: Callout was not opening programmatically on iOS when navigating from Toki details page.
- solution: Updated callout opening logic to use Marker ref's `showCallout()` method directly, with fallbacks to native handle and onPress simulation. Added better logging and multiple retry attempts with optimized timing (1200ms, 1800ms, 2500ms, 3500ms) to ensure callout opens after map animation completes.

- problem: Marker refs were not being properly accessed for programmatic callout opening.
- solution: Improved marker ref storage and access, added comprehensive logging to debug marker ref availability, and implemented multiple fallback methods (showCallout, native handle, onPress) to ensure callout opens reliably.

### How Fixes Were Implemented
- Updated `openCallout` function to first try `marker.showCallout()` directly on the Marker ref, which is the standard react-native-maps API
- Added fallback to access native component handle via `_nativeComponent` or `getNode()` if direct method fails
- Final fallback triggers `onMarkerPress` which automatically opens callout when marker is pressed
- Optimized retry delays for faster callout opening: 1700ms (1500ms animation + 200ms buffer), 2200ms. Reduced from 4 attempts to 2 to prevent callout from opening/closing multiple times.
- Added callout opened tracking to prevent multiple opens - once callout is successfully opened, subsequent retry attempts are skipped.
- Increased zoom level for tighter focus: Changed from 0.005 to 0.002 delta (~200m view) and zoom level 18 for setCamera.
- Increased animation duration from 1000ms to 1500ms for smoother, more fluid transitions.
- Fixed iOS map animation: Update region state first, then call animateToRegion after 100ms delay to ensure region prop is applied. Also call setCamera as backup with zoom 18. Call animation immediately on iOS (no requestAnimationFrame delay) for faster response.
- Removed verbose logging to reduce console clutter - kept only essential error/warning logs.

- problem: Zoom controls were positioned too high on the map, potentially interfering with other UI elements.
- solution: Lowered zoom controls position from `top: 16` to `top: 60` to provide better spacing and avoid UI conflicts.

