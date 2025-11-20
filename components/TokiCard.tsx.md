# File: TokiCard.tsx

### Summary
Card component for displaying toki information in lists and grids. Shows title, location, time, attendees, and host information. Includes a recreate button for duplicating tokis.

### Fixes Applied log
- problem: No way to recreate/duplicate a toki from the card view.
- solution: Added optional `onRecreate` callback and `showRecreateButton` flag props with recreate button.

- problem: TokiCard doesn't support unlimited max attendees (null value)
- solution: Updated TokiCardProps interface and formatAttendees function to handle null maxAttendees

- problem: Display doesn't show infinity symbol for unlimited tokis
- solution: Updated formatAttendees to show "∞" when maxAttendees is null

### How Fixes Were Implemented
- Added recreate button functionality with CopyPlus icon
- Updated TokiCardProps interface: maxAttendees from number to number | null
- Updated formatAttendees function to accept maxAttendees: number | null
- Updated formatAttendees to return `${attendees}/∞` when maxAttendees is null
