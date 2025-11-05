# File: toki-backend/src/routes/tokis.ts

### Summary
This file contains the backend routes for managing Tokis, including creation, retrieval, invites, hiding, participant management, and invite links.

### Fixes Applied log
- **Added remove participant endpoint**: Created `DELETE /:id/participants/:userId` endpoint to allow hosts to remove participants from their tokis.
- **Fixed invite link notifications**: Changed notification type from `join_request` to `participant_joined` for users joining via invite links, removing unnecessary approve/decline actions.
- **Updated category validation**: Updated hardcoded `validCategories` array to use new category names (dinner, culture, party, chill) instead of old names (food, art, social).

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
- **Category validation update**:
  - Updated `validCategories` array in both POST (create) and PUT (update) endpoints
  - Changed from: `['sports', 'coffee', 'music', 'food', 'work', 'art', 'nature', 'drinks', 'social', 'wellness', 'culture', 'morning']`
  - Changed to: `['sports', 'coffee', 'music', 'dinner', 'work', 'culture', 'nature', 'drinks', 'party', 'wellness', 'chill', 'morning']`
- **Error handling**: Comprehensive error responses for various failure scenarios (toki not found, access denied, participant not found, etc.)
- problem: Invite and join request notifications were not sending push notifications to users.
- solution: Replaced direct `INSERT INTO notifications` queries with `createSystemNotificationAndPush` for invites, and added `sendPushToUsers` calls for join requests, approvals, and declines.
- solution:
  - Imported `createSystemNotificationAndPush` from `../utils/notify` and `sendPushToUsers` from `../utils/push`.
  - Invite creation: replaced pool.query with `createSystemNotificationAndPush` to send both in-app and push notifications atomically.
  - Invite accepted: replaced pool.query with `createSystemNotificationAndPush`, then mark as read since it's a confirmation.
  - Join request (pending): added push to host when user requests to join (shows as join_request in unified feed).
  - Join approve: replaced TODO with `sendPushToUsers` to notify participant of approval.
  - Join decline: replaced TODO with `sendPushToUsers` to notify participant of decline.