# File: AppContext.tsx

### Summary
React context providing global application state and actions for tokis, users, and notifications.

### Fixes Applied log
- problem: Toki interface doesn't support unlimited max attendees or autoApprove
- solution: Updated Toki interface to allow maxAttendees as number | null and added autoApprove field

### How Fixes Were Implemented
- Updated Toki interface: maxAttendees from number to number | null, added autoApprove?: boolean field
