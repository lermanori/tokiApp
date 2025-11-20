# File: api.ts

### Summary
API service for making HTTP requests to the backend, includes type definitions for Toki and related interfaces.

### Fixes Applied log
- problem: Type definitions don't support unlimited max attendees or autoApprove
- solution: Updated Toki and SavedToki interfaces to allow maxAttendees as number | null and added autoApprove field

### How Fixes Were Implemented
- Updated Toki interface: maxAttendees from number to number | null, added autoApprove?: boolean
- Updated SavedToki interface: maxAttendees from number to number | null
- Updated createToki method signature to accept maxAttendees: number | null and autoApprove?: boolean
