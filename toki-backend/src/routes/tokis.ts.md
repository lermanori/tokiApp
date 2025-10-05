# File: toki-backend/src/routes/tokis.ts

### Summary
This file contains the backend routes for managing Tokis, including creation, retrieval, invites, hiding, participant management, and invite links.

### Fixes Applied log
- **Added remove participant endpoint**: Created `DELETE /:id/participants/:userId` endpoint to allow hosts to remove participants from their tokis.
- **Fixed invite link notifications**: Changed notification type from `join_request` to `participant_joined` for users joining via invite links, removing unnecessary approve/decline actions.

### How Fixes Were Implemented
- **New endpoint**: Added `router.delete('/:id/participants/:userId', authenticateToken, ...)` after the join-requests endpoint.
- **Validation logic**: 
  - Verifies toki exists and is active
  - Ensures only the host can remove participants
  - Checks if the user to be removed is actually a participant
  - Prevents host from removing themselves
- **Database operations**:
  - Deletes the participant record from `toki_participants` table
  - Updates `current_attendees` count in `tokis` table
- **Invite link notification fix**:
  - Changed notification type from `join_request` to `participant_joined` in join-by-link endpoint
  - Users joining via invite links are automatically approved, so no action buttons needed
- **Error handling**: Comprehensive error responses for various failure scenarios (toki not found, access denied, participant not found, etc.)