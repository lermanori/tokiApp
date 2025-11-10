# File: DiscoverMap.native.tsx

### Summary
Native map component for displaying Toki events on a map using react-native-maps. Handles marker clustering, callouts, and user interactions. This component is optimized to prevent unnecessary re-renders and map flickering.

### Fixes Applied log
- problem: Map was reloading/flickering when entering the map page, causing multiple re-renders and poor user experience.
- solution: 
  1. Freeze `initialRegionRef` on first mount only - prevents MapView from resetting when region prop changes
  2. Improved memo comparison to do deep check on events array (compare IDs) to avoid re-renders when array is recreated with same content
  3. Removed render tracking useEffect that was running on every render
  4. Prevented map re-renders during dragging by using refs to track region internally

- problem: Map was re-rendering during dragging, causing performance issues and janky behavior.
- solution: 
  1. Added `currentRegionRef` to store current region internally without causing re-renders
  2. Use `onRegionChange` to update ref during dragging (no state update, no re-render)
  3. Use `onRegionChangeComplete` to update parent state only when dragging stops (minimal re-renders)
  4. Updated zoom buttons to use `currentRegionRef` instead of `region` prop

- problem: Zoom controls on iOS don't work - buttons update state but don't actually move the map.
- solution: 
  1. Added `mapViewRef` to get reference to MapView component
  2. Use `animateToRegion()` method to programmatically animate the map to new zoom level
  3. This is required on iOS because just updating the region prop doesn't trigger map movement
  4. Animation duration set to 300ms for smooth zoom transitions

### How Fixes Were Implemented
- problem: `initialRegionRef` was being updated on every render when region prop changed, causing MapView to reset
- solution: Added `isFirstMountRef` to track first render. Only set `initialRegionRef.current = region` on the very first render. After that, the initial region is frozen and never updated, preventing MapView from resetting.

- problem: Memo comparison was doing shallow check on events array, causing re-renders when array was recreated with same content
- solution: Enhanced memo comparison to do deep check: if events array reference changed, compare event IDs. Only re-render if IDs actually changed, not just the array reference.

- problem: Render tracking useEffect was running on every render, adding unnecessary overhead
- solution: Removed the render tracking useEffect that was logging re-renders. This was only for debugging and not needed in production.

- problem: Map component was re-rendering during dragging because `onRegionChangeComplete` was updating parent state, which caused the region prop to change, triggering re-renders
- solution: 
  1. Added `currentRegionRef` to store the current region internally
  2. Split region change handling: `onRegionChange` (continuous during drag) only updates the ref, `onRegionChangeComplete` (when drag stops) updates parent state
  3. This ensures the map component itself never re-renders during dragging - only the ref is updated
  4. Updated zoom button handlers to use `currentRegionRef.current` instead of `region` prop to get the latest region value
  5. Added useEffect to sync `currentRegionRef` when region prop changes from parent (for programmatic updates)

- problem: Zoom controls on iOS don't work because just calling `onRegionChange` updates state but doesn't actually move the map view
- solution: 
  1. Added `mapViewRef` using `useRef<MapView>(null)` to get reference to the MapView component
  2. Attached ref to MapView component: `ref={mapViewRef}`
  3. In zoom button handlers, call `mapViewRef.current.animateToRegion(next, 300)` to programmatically animate the map
  4. This is required on iOS because the map doesn't automatically update when the region prop changes - you need to explicitly call `animateToRegion()`
  5. Still update `currentRegionRef` and call `onRegionChange` to keep state in sync

