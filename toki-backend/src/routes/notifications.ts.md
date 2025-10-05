# File: toki-backend/src/routes/notifications.ts

### Summary
This file contains the backend routes for fetching and managing notifications, including the `/combined` endpoint that merges various notification sources.

### Fixes Applied log
- **Added participant_joined notification handling**: Added special handling for `participant_joined` notification type to properly format notifications for users who joined via invite links.

### How Fixes Were Implemented
- **New notification type handling**: Added special case for `participant_joined` type in the system notifications mapping.
- **Proper data mapping**: 
  - Sets `actionRequired: false` since no approval needed for invite link joins
  - Maps `tokiId`, `tokiTitle`, `userId`, and `userName` for proper display
  - Uses `inviter_name` field to get the participant's name
- **Consistent formatting**: Follows the same pattern as other notification types for consistent frontend handling.