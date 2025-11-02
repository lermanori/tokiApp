# File: app/(tabs)/messages.tsx

### Summary
This file contains the Messages screen displaying conversations and group chats. Shows a list of conversations with unread indicators and allows navigation to individual chat screens.

### Fixes Applied log
- problem: White space appeared above the tab bar on the Messages screen.
- solution: Added `edges={['top', 'left', 'right']}` to SafeAreaView to exclude the bottom edge, preventing double spacing since the tab bar already handles bottom spacing.

### How Fixes Were Implemented
- Modified SafeAreaView component to exclude the bottom edge by adding the `edges` prop. This prevents SafeAreaView from adding bottom padding for the safe area (home indicator), which was creating double spacing with the tab bar's reserved space.
