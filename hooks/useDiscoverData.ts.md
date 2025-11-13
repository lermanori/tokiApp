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
