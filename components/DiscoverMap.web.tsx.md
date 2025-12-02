# File: DiscoverMap.web.tsx

### Summary
This file contains the web-only interactive map component using React Leaflet. It displays Toki events as clustered markers on a map, handles user interactions, and implements radius-based movement constraints around the user's profile location.

### Fixes Applied log
- **Problem**: Map position was resetting after API responses due to controlled props in React Leaflet.
- **Solution**: Implemented module-level state persistence and uncontrolled initial props to maintain map position across re-renders.

- **Problem**: User could pan the map beyond their profile radius, breaking the spatial constraint.
- **Solution**: Added radius-based pan constraint using haversine distance calculation and point clamping. When the user tries to move beyond the allowed radius, the map center is automatically clamped back to the boundary.

- **Problem**: Event listener closure captured stale values of `profileCenter` and `maxRadiusMeters` props.
- **Solution**: Used refs (`profileCenterRef`, `maxRadiusMetersRef`) to always access current prop values without recreating the event listener.

- **Problem**: No visual indication of the allowed movement radius.
- **Solution**: Added a semi-transparent Circle overlay showing the allowed movement area around the profile location.

- **Problem**: Map was not centering on user's profile location on initial load - it would only jump to the correct location after the user moved the map slightly.
- **Solution**: Updated initialization logic to check for `profileCenter` via refs during first mount, and added a separate effect that watches for `profileCenter` to become available (handles async geocoding) and centers the map once if it's far from the profile location (>1km).

- **Problem**: Infinite loop causing "Maximum call stack size exceeded" error when clamping map movement. Calling `map.setView()` to clamp the center triggered another `moveend` event, which called the handler again, creating an infinite recursion.
- **Solution**: Added `isClampingRef` flag to track when we're programmatically setting the view. The handler checks this flag at the start and returns early if set, preventing recursive calls. The flag is set before `setView()` and reset after a 100ms timeout to allow the triggered `moveend` event to be ignored. Also added distance check with 10m tolerance before clamping to avoid unnecessary calculations.

### How Fixes Were Implemented

**Module-Level State Persistence**:
- Added module-level variables (`lastKnownMapCenter`, `lastKnownMapZoom`, `mapHasBeenInitialized`) that persist across component remounts
- Map position is tracked via Leaflet's `moveend` event, not React props
- Initial map center/zoom are set once and never updated via props after mount

**Radius Constraint Implementation**:
- Added haversine distance calculation function (`haversineDistanceMeters`) for accurate distance measurement
- Implemented `clampPointToRadius` function that projects points outside the radius back onto the circle boundary
- In `MapController`'s `handleMoveEnd` event handler, check if the new center exceeds the radius and clamp it if necessary
- Used refs to access current `profileCenter` and `maxRadiusMeters` values without recreating the event listener
- Added `isClampingRef` flag to prevent infinite loop: when programmatically calling `map.setView()` to clamp the center, the flag is set to skip the next `moveend` event handler call, preventing recursion
- Added distance check with 10m tolerance before clamping to avoid unnecessary calculations and improve performance

**Visual Feedback**:
- Added `Circle` component import from react-leaflet
- Rendered a semi-transparent purple circle overlay when `profileCenter` and `maxRadiusMeters` are provided
- Circle uses brand color (#B49AFF) with 10% fill opacity and 40% border opacity for subtle visibility

**Props Interface**:
- Extended `Props` interface with optional `profileCenter` and `maxRadiusMeters` props
- These props are passed from the parent component (`exMap.tsx`) which computes them from user profile and filter settings

**Profile Center Initialization**:
- Modified initialization logic to check `profileCenterRef.current` during first mount, prioritizing profile center over default initial props
- Added a `useEffect` that watches for `profileCenter` to become available after initial mount (handles async geocoding)
- The effect only centers the map if the current position is more than 1km away from profile center, preventing disruption if user has already moved the map
- Uses `hasAppliedProfileCenterRef` to ensure the centering only happens once
- Respects priority: highlighted coordinates > last known position > profile center > initial props
