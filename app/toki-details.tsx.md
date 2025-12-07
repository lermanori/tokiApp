# File: app/toki-details.tsx

### Summary
Toki details screen component displaying full event information, join/chat functionality, and participant management.

### Fixes Applied log
- **problem**: joinStatus type and logic included 'joined' status which was deprecated in favor of 'approved', causing inconsistencies in UI and functionality.
- **solution**: Removed 'joined' from joinStatus type definition. Updated all status checks from `'joined' || 'approved'` to just `'approved'`. Removed 'joined' cases from switch statements in getJoinButtonText and getJoinButtonColor. Updated mock data to use 'approved' instead of 'joined'. Changed sendJoinRequest result handling from 'joined' to 'approved'.
- **problem**: Invite link section was visible to non-host users in the InviteModal, but only hosts can create invite links (backend returns 404 for non-hosts).
- **solution**: Added `isHost={toki.isHostedByUser || false}` prop to InviteModal component to conditionally hide invite link functionality for non-hosts.
- **problem**: Location press in toki details was navigating to `/(tabs)/discover` which is archived, instead of the active `/(tabs)/exMap` screen, preventing the map from highlighting the toki and opening the pin.
- **solution**: Changed navigation pathname from `/(tabs)/discover` to `/(tabs)/exMap` in the location TouchableOpacity onPress handler. The exMap screen already has logic to handle `highlightTokiId` parameter to center the map, highlight the toki, and open the pin callout.

### How Fixes Were Implemented
- **problem**: Multiple places checked for both 'joined' and 'approved' status, and mock data used 'joined'.
- **solution**: Standardized all status checks to only use 'approved'. Updated handleJoinPress to check only 'approved'. Updated handleChatPress and canAccessChat to only check 'approved'. Updated handleInvitePress to only check 'approved'. Removed 'joined' cases from switch statements, keeping only 'approved' case. Changed mock data joinStatus from 'joined' to 'approved'.
- **problem**: Non-host users could see and attempt to use the "Create Invite Link" button, which would fail with a 404 error since the backend only allows hosts to create invite links.
- **solution**: Updated InviteModal component call to pass `isHost={toki.isHostedByUser || false}` prop. This ensures the invite link section (including "Create Invite Link" button and existing link management) is only visible to users who are hosting the toki.
- **problem**: Location press handler was navigating to the wrong screen (`/(tabs)/discover` instead of `/(tabs)/exMap`), causing the map highlighting feature to not work.
- **solution**: Updated the router.push pathname in the location TouchableOpacity onPress handler (line 1517) from `'/(tabs)/discover'` to `'/(tabs)/exMap'`. The exMap screen has existing useEffect logic that watches for `highlightTokiId` in params, finds the toki in filtered events or fetches it from the API, sets highlighted state, centers the map on the toki coordinates, and ensures the map is visible. The DiscoverMap component then handles opening the pin callout automatically.
