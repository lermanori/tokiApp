# File: app/notifications.tsx

### Summary
This file contains the frontend component for displaying notifications with unified styling, time-based grouping, and proper navigation handling.

### Fixes Applied log
- **Added participant_joined notification type**: Added support for `participant_joined` notification type in the Notification interface.
- **Updated notification rendering**: Added `participant_joined` to the list of notification types that show an "Open" button but no approve/decline actions.
- **Unified notification styling**: Changed all notifications to use consistent white background instead of type-specific colors.
- **Consistent icon styling**: Updated all notification icons to use the same purple color (#B49AFF) for visual consistency.
- **Instagram-style time grouping**: Implemented time-based grouping with "Today", "Yesterday", "Last Week", and "Older" sections.
- **Enhanced navigation**: Improved notification tap handling to navigate to appropriate screens (user profiles for connections, toki details for tokis).
- **Fixed navigation routing**: Corrected connection notifications to navigate to user profiles instead of chat, and join request approved notifications to navigate to toki details instead of messages.
- **Route registration fix**: Added missing `user-profile/[userId]` route registration in `_layout.tsx` to enable proper navigation to user profiles.
- **Removed Open button**: Made entire notification clickable instead of having a separate "Open" button for better UX.
- **Fixed connection_accepted userId**: Updated backend to include `userId` field for connection_accepted notifications so they can navigate to user profiles.
- **Fixed join_approved tokiId**: Updated backend to include `tokiId` field for join_approved notifications so they can navigate to toki details.

### How Fixes Were Implemented
- **Interface update**: Added `participant_joined` to the union type of notification types in the Notification interface.
- **Rendering logic**: Added `notification.type === 'participant_joined'` to the condition that shows the "Open" button.
- **No action buttons**: `participant_joined` notifications only show the "Open" button, not approve/decline actions, since users joining via invite links are automatically approved.
- **Consistent UX**: Follows the same pattern as other informational notifications like `join_approved` and `invite_accepted`.
- **Styling unification**: Replaced `getNotificationColor()` function to return consistent white background for all notification types.
- **Icon consistency**: Updated all notification icons to use the same purple color (#B49AFF) and added missing icons for invite-related notifications.
- **Time grouping**: Added `groupNotificationsByTime()` function that categorizes notifications by date ranges and renders them with section headers.
- **Navigation logic**: Enhanced `handleOpen()` function to properly route users based on notification type and available data (userId, tokiId, etc.).
- **Visual improvements**: Added consistent icon container styling with light gray background (#F3F4F6) and proper spacing for time group headers.
- **Interface expansion**: Added `connection_request` and `connection_accepted` to the Notification type union to support connection-related notifications.
- **Navigation fixes**: Updated routing logic to correctly handle connection notifications (go to user profile) and join request approved notifications (go to toki details).
- **Route registration**: Added `<Stack.Screen name="user-profile/[userId]" options={{ headerShown: false }} />` to `app/_layout.tsx` to properly register the user profile route for navigation.
- **UI simplification**: Removed the "Open" button and made the entire notification item clickable for better user experience.
- **Backend data fix**: Updated the SQL query in `toki-backend/src/routes/notifications.ts` to include `recipient_id` and properly set `userId` for connection_accepted notifications.
- **Join approved fix**: Updated the SQL query for `userApproved` notifications to include `t.id as toki_id` and set `tokiId` field so join_approved notifications can navigate to toki details.