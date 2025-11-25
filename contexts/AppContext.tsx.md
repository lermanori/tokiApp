# File: AppContext.tsx

### Summary
React context providing global application state and actions for tokis, users, and notifications.

### Fixes Applied log
- problem: Toki interface doesn't support unlimited max attendees or autoApprove
- solution: Updated Toki interface to allow maxAttendees as number | null and added autoApprove field
- problem: Creating toki with unlimited participants doesn't save correctly - defaults to 10 instead of null
- solution: Fixed maxAttendees assignment in createToki to properly handle null values using !== undefined check instead of || operator

### How Fixes Were Implemented
- Updated Toki interface: maxAttendees from number to number | null, added autoApprove?: boolean field
- Changed maxAttendees assignment in createToki function from `tokiData.maxAttendees || 10` to `tokiData.maxAttendees !== undefined ? tokiData.maxAttendees : 10` to preserve null values for unlimited participants
