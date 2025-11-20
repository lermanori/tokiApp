# File: edit-toki.tsx

### Summary
Screen for editing existing tokis, loads initial data and handles updates.

### Fixes Applied log
- problem: Handle unlimited max attendees (null value) when loading initial data
- solution: Updated initialData to preserve null for maxAttendees instead of defaulting to 10

- problem: Include autoApprove in edit flow
- solution: Added autoApprove to initialData and update payload

### How Fixes Were Implemented
- Updated loadTokiData to preserve null for maxAttendees when loading from backend
- Added autoApprove to initialData object when loading toki
- Added autoApprove to update payload in handleUpdateToki
