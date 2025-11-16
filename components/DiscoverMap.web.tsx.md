# File: DiscoverMap.web.tsx

### Summary
This file contains the web map component using React Leaflet. It displays clustered event markers on a map and supports programmatically opening popups when navigating from the Toki details page.

### Fixes Applied log
- problem: Popup was not opening programmatically on web when navigating from Toki details page.
- solution: Added MapController component using useMap hook to access Leaflet map instance. Updated popup opening logic to properly access marker's leafletElement and call openPopup(). Added multiple access methods (direct leafletElement, getLeafletElement(), map layers) with comprehensive logging and retry logic.

- problem: Map instance was not accessible for programmatic popup control.
- solution: Created MapController component that uses useMap() hook (must be inside MapContainer) to get the map instance and store it in mapInstanceRef. This allows the popup opening logic to access the map's internal layers structure if needed.

- problem: Map icons were flickering on every render due to icon recreation and MapContainer remounting.
- solution: Fixed icon flickering by: 1) Memoizing icon creation with useCallback and caching icons in a ref-based Map to prevent recreation on every render, 2) Changed MapContainer key from dynamic (based on highlightedTokiId) to stable "map-container" to prevent unnecessary remounts, 3) Added programmatic map centering via map.setView() in MapController when highlighted coordinates change, eliminating the need for remounting, 4) Added icon cache cleanup logic to prevent memory leaks when cluster count changes significantly.

### How Fixes Were Implemented
- Added MapController component that uses useMap() hook to access the Leaflet map instance
- MapController sets mapInstanceRef.current = map so it's available to the popup opening logic
- Updated openPopup function to try multiple methods to access leafletElement:
  1. Direct access via marker.leafletElement
  2. Via getLeafletElement() method if available
  3. Via map._layers using marker's _leaflet_id
- Added comprehensive logging to debug marker ref and leafletElement availability
- Implemented multiple retry attempts with optimized timing (200ms, 500ms, 1000ms, 2000ms) for faster popup opening while accounting for map remounting and marker initialization
- Each retry attempt logs detailed information about marker ref state for debugging
- Optimized timing: Reduced initial delay from 1000ms to 200ms for faster popup opening after map centers

**Icon Flickering Fix:**
- Created iconCache ref using Map<string, any> to store created Leaflet icons
- Implemented getMarkerIcon callback that checks cache before creating new icons
- Cache key includes cluster key, category, and item count to ensure uniqueness
- Changed MapContainer key from dynamic `map-${highlightedTokiId}` to stable `"map-container"` to prevent remounts
- Added useEffect in MapController to programmatically center map using map.setView() when highlighted coordinates change
- Added icon cache cleanup logic that clears cache when cluster count changes significantly (prevents memory leaks)
- Icons are now reused across renders instead of being recreated, eliminating flickering

- problem: Map controls were positioned too high on the map, potentially interfering with other UI elements. Leaflet's default zoom controls were visible.
- solution: Lowered map controls position from `top: 16` to `top: 60` to provide better spacing and avoid UI conflicts. Disabled Leaflet's default zoom controls using `zoomControl={false}` prop. Fixed TypeScript linting error by adding explicit type annotation to Marker ref parameter.
