# File: contexts/AppContext.tsx

### Summary
Global app state management with actions for loading tokis, managing connections, and handling user data. Now includes friends going data in all toki load functions.

### Fixes Applied log
- **problem**: Friends attending data from backend wasn't being mapped to internal state for TokiCard components.
- **solution**: Added friendsGoing field to internal Toki interface and mapped friendsAttending from API responses to friendsGoing in all load functions.
- **problem**: Location changes didn't clear old tokis when new location had no tokis, causing map to show wrong location's tokis
- **solution**: Changed loadNearbyTokis to always dispatch SET_TOKIS on refresh (append: false), even if empty. This ensures location changes properly clear old tokis and show correct state for new location

### How Fixes Were Implemented
- **problem**: Backend returns friendsAttending but frontend TokiCard expects friendsGoing prop.
- **solution**: Added `friendsGoing?: Array<{ id: string; name: string; avatar?: string }>` to internal Toki interface. Updated loadNearbyTokis, loadTokis, loadMyTokis, and loadTokisWithFilters to map `(apiToki as any).friendsAttending || []` to `friendsGoing` field. This ensures friends overlay appears on all TokiCards throughout the app when data is available.

- **problem**: joinStatus type and logic included 'joined' status which was deprecated in favor of 'approved', causing inconsistencies.
- **solution**: Removed 'joined' from joinStatus type definition. Updated all status checks from `'joined' || 'approved'` to just `'approved'`. Changed sendJoinRequest return type from `'joined' | 'pending'` to `'approved' | 'pending'`. Updated user stats calculation and join status update logic to only check for 'approved' status.
