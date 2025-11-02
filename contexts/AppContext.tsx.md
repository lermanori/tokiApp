# File: contexts/AppContext.tsx

### Summary
This file contains the global state management and API actions for the Toki app, including user authentication, toki management, connections, and messaging.

### Fixes Applied log
- **Added remove participant action**: Created `removeParticipant(tokiId: string, userId: string)` action to remove participants from tokis.
- **Updated AppContextType interface**: Added `removeParticipant` method to the actions interface.
- **Added to actions export**: Included `removeParticipant` in the exported actions object.
- **Prevented repeated unauthenticated fetches**: Added in-flight + cooldown guards to `loadTokis` and `loadTokisWithFilters`, and skipped fetching on `/join` and `/login` routes to stop bursts of `/api/tokis` requests for unlogged users.
- **Throttled health/auth checks**: Added guards and 3s cooldowns for `checkConnection` (API root) and `checkAuthStatus` (`/auth/me`), and skip both on `/join` and `/login` routes to prevent `net::ERR_INSUFFICIENT_RESOURCES` from request storms.
- **Fixed window.location.pathname crashes on React Native**: Updated all four instances where `window.location.pathname` was accessed (`checkConnection`, `loadTokis`, `loadTokisWithFilters`, `checkAuthStatus`) to safely check if `window.location` exists before accessing `pathname`, preventing "Cannot read property 'pathname' of undefined" errors on native devices.

### How Fixes Were Implemented
- **Interface update**: Added `removeParticipant: (tokiId: string, userId: string) => Promise<boolean>;` to the `AppContextType` interface.
- **Implementation**: Created async function that calls `apiService.removeParticipant()` and refreshes toki data on success.
- **Data refresh**: Uses `setTimeout(() => loadTokis(), 100)` to refresh the tokis list after successful removal.
- **Error handling**: Catches and logs errors, returns boolean success status.
- **Actions export**: Added `removeParticipant` to the actions object exported by the context provider.
- **Request throttling**: Introduced `isFetchingTokis` and `lastTokisFetchMs` state; bail out if a fetch is in-flight or if the previous fetch happened <3s ago. Also early-return on auth/join routes.
- **Health/Auth throttling**: Added `isCheckingConnection`, `lastConnectionCheckMs`, `isCheckingAuthStatus`, and `lastAuthStatusCheckMs` with the same cooldown/skip logic.
- **React Native window.location safety**: Changed all `window.location.pathname` accesses from `typeof window !== 'undefined' ? window.location.pathname : ''` to `typeof window !== 'undefined' && window.location?.pathname ? window.location.pathname : ''` to properly handle React Native environments where `window` exists but `window.location` doesn't.