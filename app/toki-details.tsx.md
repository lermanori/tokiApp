# File: app/toki-details.tsx

### Summary
Toki details screen component displaying full event information, join/chat functionality, and participant management.

### Fixes Applied log
- **problem**: joinStatus type and logic included 'joined' status which was deprecated in favor of 'approved', causing inconsistencies in UI and functionality.
- **solution**: Removed 'joined' from joinStatus type definition. Updated all status checks from `'joined' || 'approved'` to just `'approved'`. Removed 'joined' cases from switch statements in getJoinButtonText and getJoinButtonColor. Updated mock data to use 'approved' instead of 'joined'. Changed sendJoinRequest result handling from 'joined' to 'approved'.

### How Fixes Were Implemented
- **problem**: Multiple places checked for both 'joined' and 'approved' status, and mock data used 'joined'.
- **solution**: Standardized all status checks to only use 'approved'. Updated handleJoinPress to check only 'approved'. Updated handleChatPress and canAccessChat to only check 'approved'. Updated handleInvitePress to only check 'approved'. Removed 'joined' cases from switch statements, keeping only 'approved' case. Changed mock data joinStatus from 'joined' to 'approved'.
