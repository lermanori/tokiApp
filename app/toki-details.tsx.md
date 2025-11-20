# File: toki-details.tsx

### Summary
Screen displaying detailed information about a specific toki including participants, host info, and join status.

### Fixes Applied log
- problem: TokiDetails interface doesn't support unlimited max attendees or autoApprove
- solution: Updated TokiDetails interface to allow maxAttendees as number | null and added autoApprove field

- problem: Display shows "1/0 people" for unlimited tokis instead of infinity symbol
- solution: Updated display to show "∞" when maxAttendees is null, and preserve null value when loading data

### How Fixes Were Implemented
- Updated TokiDetails interface: maxAttendees from number to number | null, added autoApprove?: boolean field
- Updated data loading to preserve null for maxAttendees instead of converting to 0
- Updated participant count display to show "∞" symbol when maxAttendees is null: `{toki.attendees}/{toki.maxAttendees === null ? '∞' : toki.maxAttendees} people`
