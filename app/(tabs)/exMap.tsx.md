# File: exMap.tsx

### Summary
This file contains the Explore/Map screen component that displays tokis on a map and in a list view. It handles user location, map region updates, filtering, sorting, and pagination.

### Fixes Applied log
- **problem**: Maximum update depth exceeded error caused by infinite loop in `useFocusEffect` and `useEffect` hooks
- **solution**: Removed `actions` from dependency arrays since the `actions` object is recreated on every render, causing infinite re-renders. Added ESLint disable comments where appropriate.

- **problem**: `actions.setLoading` method doesn't exist on the actions object
- **solution**: Replaced `actions.setLoading(false)` calls with `dispatch({ type: 'SET_LOADING', payload: false })` to properly update loading state.

- **problem**: Clipboard button (📋) on the map does nothing - map toggle functionality was not working
- **solution**: Fixed conditional rendering of map component based on `showMap` state, and passed actual `showMap` state to `DiscoverCategories` instead of hardcoded `true`. Added `showMap` to `useMemo` dependencies to ensure re-render when toggled.

- **problem**: No way to reopen the map when it's closed, and categories bar was overlapping the header when map was hidden
- **solution**: Added map toggle button (MapPin icon) to the header controls that's always visible. Button highlights in purple when map is visible. Added spacing spacer when map is hidden to prevent categories from overlapping the header.

### How Fixes Were Implemented
1. **Fixed infinite loop in useFocusEffect (line 300-309)**: Removed `actions` from dependency array. The `actions.loadCurrentUser()` function is stable, so we only need to depend on `state.isConnected` and `state.currentUser?.latitude`.

2. **Fixed infinite loop in useEffect (line 251-279)**: Removed `actions` from dependency array for image loading tracking effect. The `actions.setLoading` was replaced with `dispatch` anyway.

3. **Fixed useCallback dependency (line 499-519)**: Removed `actions` from `applyFilters` callback dependencies since `actions.loadTokisWithFilters` is a stable function reference.

4. **Fixed setLoading calls**: 
   - Added `dispatch` to destructured values from `useApp()` hook
   - Replaced `actions.setLoading(false)` with `dispatch({ type: 'SET_LOADING', payload: false })` in two places (lines 265 and 274)

The root cause was that the `actions` object in `AppContext` is recreated on every render, so including it in dependency arrays caused effects to run repeatedly, creating an infinite loop when those effects called functions that updated state.

5. **Fixed map toggle functionality (line 770, 775, 798)**:
   - Changed map rendering from always showing to conditional: `{showMap && mapComponent && typeof mapComponent === 'object' ? mapComponent : null}`
   - Changed `showMap={true}` to `showMap={showMap}` when passing to `DiscoverCategories` component
   - Added `showMap` to the `useMemo` dependency array so the component re-renders when the toggle button is pressed
   - Now the clipboard button (📋) on the map correctly toggles between showing and hiding the map view

6. **Added persistent map toggle button and fixed spacing (line 5, 732-739, 774, 1170-1173)**:
   - Added `MapPin` import from `lucide-react-native`
   - Added map toggle button to header controls that conditionally renders only when map is closed (`{!showMap && ...}`)
   - When map is open, the clipboard button on the map itself handles closing it
   - When map is closed, the header button allows reopening it
   - Added `categoriesSpacer` View component that renders when map is hidden to provide proper spacing (20px) between header and categories
   - Prevents categories bar from overlapping the header when map is closed
