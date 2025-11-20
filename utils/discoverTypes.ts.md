# File: discoverTypes.ts

### Summary
TypeScript type definitions for discover screen and toki events.

### Fixes Applied log
- problem: TokiEvent interface doesn't support unlimited max attendees or autoApprove
- solution: Updated TokiEvent interface to allow maxAttendees as number | null and added autoApprove field

### How Fixes Were Implemented
- Updated TokiEvent interface: maxAttendees from number to number | null, added autoApprove?: boolean field
