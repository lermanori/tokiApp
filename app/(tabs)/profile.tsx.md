# File: app/(tabs)/profile.tsx

### Summary
This file contains the Profile screen showing user information, activity, saved Tokis count, and profile settings. Displays user avatar, stats, activity feed, and settings options.

### Fixes Applied log
- problem: White space appeared above the tab bar on the Profile screen.
- solution: Added `edges={['top', 'left', 'right']}` to SafeAreaView to exclude the bottom edge, preventing double spacing since the tab bar already handles bottom spacing.

### How Fixes Were Implemented
- Modified SafeAreaView component to exclude the bottom edge by adding the `edges` prop. This prevents SafeAreaView from adding bottom padding for the safe area (home indicator), which was creating double spacing with the tab bar's reserved space.
