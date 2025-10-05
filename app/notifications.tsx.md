# File: app/notifications.tsx

### Summary
This file contains the frontend component for displaying notifications with different types and actions.

### Fixes Applied log
- **Added participant_joined notification type**: Added support for `participant_joined` notification type in the Notification interface.
- **Updated notification rendering**: Added `participant_joined` to the list of notification types that show an "Open" button but no approve/decline actions.

### How Fixes Were Implemented
- **Interface update**: Added `participant_joined` to the union type of notification types in the Notification interface.
- **Rendering logic**: Added `notification.type === 'participant_joined'` to the condition that shows the "Open" button.
- **No action buttons**: `participant_joined` notifications only show the "Open" button, not approve/decline actions, since users joining via invite links are automatically approved.
- **Consistent UX**: Follows the same pattern as other informational notifications like `join_approved` and `invite_accepted`.