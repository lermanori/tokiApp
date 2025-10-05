# File: app/toki-details.tsx

### Summary
This file contains the frontend component for displaying Toki details, including participant management, invite functionality, and host actions.

### Fixes Applied log
- **Added remove participant UI**: Added small "X" button next to each participant for hosts to remove them.
- **Added remove participant handler**: Created `handleRemoveParticipant` function with confirmation dialog.
- **Added remove button styles**: Created `removeParticipantButton` style for the X button.

### How Fixes Were Implemented
- **UI enhancement**: Modified the participants mapping to include a conditional remove button that only shows for hosts and non-host participants.
- **Handler function**: Created `handleRemoveParticipant(userId: string, participantName: string)` that shows a confirmation alert before removing.
- **Confirmation dialog**: Uses `Alert.alert` with "Cancel" and "Remove" options, with destructive styling for the remove action.
- **API integration**: Calls `actions.removeParticipant(toki.id, userId)` and handles success/error responses.
- **Styling**: Added `removeParticipantButton` style with red background, border, and proper sizing for the X icon.
- **Conditional rendering**: Only shows the remove button when `toki.isHostedByUser` is true and the participant is not the host.