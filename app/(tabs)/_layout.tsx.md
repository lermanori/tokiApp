# File: app/(tabs)/_layout.tsx

### Summary
Tab bar navigation layout. Added notifications tab with Bell icon and moved notification count badge from profile to notifications tab.

### Fixes Applied log
- problem: Notifications were only accessible from profile tab, and badge was on profile tab instead of a dedicated notifications tab.
- solution: Added new notifications tab with Bell icon and notification count badge. Removed badge from profile tab.

### How Fixes Were Implemented
- Added Bell import from lucide-react-native
- Added new Tabs.Screen for notifications with Bell icon
- Moved notification count badge from profile tab to notifications tab
- Removed badge and iconContainer wrapper from profile tab (now just User icon)
- Badge shows unread count (capped at 99, displays "9+" for 10+)
