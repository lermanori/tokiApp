# File: hooks/useDiscoverData.ts

### Summary
Custom hook for discover/map screen data management. Provides events, map region, connections, and pagination state. Now uses centralized connections state instead of loading connections separately. Also refreshes notifications when refreshing tokis.

### Fixes Applied log
- problem: Hook maintained local state for userConnections and loaded connections separately via API call, causing duplicate requests and inconsistent state.
- solution: Removed local userConnections state and useEffect that loaded connections. Updated to use state.userConnectionsIds from global state.
- problem: Refreshing in exMap only refreshed tokis, not notifications.
- solution: Updated handleRefresh to also call actions.loadNotifications() in parallel with loadNearbyTokis.

### How Fixes Were Implemented
- Removed `const [userConnections, setUserConnections] = useState<string[]>([]);`
- Removed useEffect that called `actions.getConnections()` and set local state.
- Updated return value to use `state.userConnectionsIds` directly instead of local state.
- Updated handleRefresh to use Promise.all() to refresh both tokis and notifications in parallel.
- Added actions to handleRefresh dependencies.
- This ensures connections are loaded once globally and reused everywhere, and notifications refresh when exMap refreshes.
- problem: Initial load effect was running twice in React strict mode, causing duplicate API requests.
- solution: Set `hasInitiallyLoadedRef.current = true` immediately before making the request (not after), preventing the second strict mode render from triggering another request. The ref check happens before the async call, so both renders see the ref as true after the first one sets it.
- problem: `onEndReached` was firing immediately on initial render before content loaded, causing `handleLoadMore` to increment `currentPage` to 2 and request page 2 (which was empty), making tokis disappear.
- solution: Added guards in `handleLoadMore` to: (1) check `hasInitiallyLoadedRef.current` to prevent load more until initial load completes, (2) check `state.tokis.length === 0` as a safety check, (3) reset `currentPage` to 1 when `append: false` (refresh) in `loadNearbyTokis`, (4) explicitly reset `currentPage` to 1 in `handleRefresh`. This ensures page 2 is only requested after initial load completes and user actually scrolls to the end.
