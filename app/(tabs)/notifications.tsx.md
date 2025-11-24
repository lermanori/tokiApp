# File: app/(tabs)/notifications.tsx

### Summary
Notifications screen moved to tabs. Displays all notifications grouped by time (Today, Yesterday, Last Week, Older) with actions for join requests, connection requests, and invites. Removed back button since it's now in a tab.

### Fixes Applied log
- problem: Notifications screen was outside tabs, requiring navigation from profile. User wanted it as a dedicated tab with badge.
- solution: Created notifications.tsx in tabs folder, removed back button, added to tab layout with Bell icon and notification count badge.

### How Fixes Were Implemented
- Copied notifications.tsx from app/ to app/(tabs)/
- Removed ArrowLeft back button and related styles
- Updated header layout to center title without back button
- Tab layout updated to show Bell icon with count badge
- Badge moved from profile tab to notifications tab



