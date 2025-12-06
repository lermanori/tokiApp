# File: exMap.tsx

### Summary
This file contains the Explore/Map screen component that displays tokis on a map and in a list view. It handles user location, map region updates, filtering, sorting, and pagination.

### Fixes Applied log
- **problem**: Maximum update depth exceeded error caused by infinite loop in `useFocusEffect` and `useEffect` hooks
- **solution**: Removed `actions` from dependency arrays since the `actions` object is recreated on every render, causing infinite re-renders. Added ESLint disable comments where appropriate.

- **problem**: `actions.setLoading` method doesn't exist on the actions object
- **solution**: Replaced `actions.setLoading(false)` calls with `dispatch({ type: 'SET_LOADING', payload: false })` to properly update loading state.

### How Fixes Were Implemented
1. **Fixed infinite loop in useFocusEffect (line 300-309)**: Removed `actions` from dependency array. The `actions.loadCurrentUser()` function is stable, so we only need to depend on `state.isConnected` and `state.currentUser?.latitude`.

2. **Fixed infinite loop in useEffect (line 251-279)**: Removed `actions` from dependency array for image loading tracking effect. The `actions.setLoading` was replaced with `dispatch` anyway.

3. **Fixed useCallback dependency (line 499-519)**: Removed `actions` from `applyFilters` callback dependencies since `actions.loadTokisWithFilters` is a stable function reference.

4. **Fixed setLoading calls**: 
   - Added `dispatch` to destructured values from `useApp()` hook
   - Replaced `actions.setLoading(false)` with `dispatch({ type: 'SET_LOADING', payload: false })` in two places (lines 265 and 274)

The root cause was that the `actions` object in `AppContext` is recreated on every render, so including it in dependency arrays caused effects to run repeatedly, creating an infinite loop when those effects called functions that updated state.
