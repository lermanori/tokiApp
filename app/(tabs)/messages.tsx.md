# File: app/(tabs)/messages.tsx

### Summary
This file contains the Messages screen displaying conversations and group chats. Shows a list of conversations with unread indicators and allows navigation to individual chat screens.

### Fixes Applied log
- problem: White space appeared above the tab bar on the Messages screen.
- solution: Added `edges={['top', 'left', 'right']}` to SafeAreaView to exclude the bottom edge, preventing double spacing since the tab bar already handles bottom spacing.
- problem: Profile pictures in messages tab were showing placeholder stock photos when users didn't have avatars.
- solution: Replaced placeholder photo with initials fallback pattern. Now shows user's profile picture if available, otherwise displays a circular view with user initials, matching the pattern used throughout the rest of the app.

### How Fixes Were Implemented
- Modified SafeAreaView component to exclude the bottom edge by adding the `edges` prop. This prevents SafeAreaView from adding bottom padding for the safe area (home indicator), which was creating double spacing with the tab bar's reserved space.
- Imported `getInitials` helper function from `@/utils/tokiUtils` to extract user initials from names.
- Updated avatar rendering logic to conditionally show Image component when `other_user_avatar` exists, otherwise render a View with initials.
- Added `avatarFallback` and `avatarInitials` styles matching the pattern used in connections screen: 60x60 circle with `#F3F4F6` background, `#D1D5DB` border, and `Inter-SemiBold` text in `#6B7280` color.
- Removed hardcoded placeholder photo URL to ensure consistent user experience across the app.
