# File: app/(tabs)/profile.tsx

### Summary
This file contains the Profile screen showing user information, activity, saved Tokis count, and profile settings. Displays user avatar, stats, activity feed, and settings options.

### Fixes Applied log
- problem: White space appeared above the tab bar on the Profile screen.
- solution: Added `edges={['top', 'left', 'right']}` to SafeAreaView to exclude the bottom edge, preventing double spacing since the tab bar already handles bottom spacing.

- problem: The "Connections" label in the stats section was splitting across two lines due to insufficient container width.
- solution: Reduced padding on stats container from 16 to 14, reduced divider margins from 8 to 6, and added `minWidth: 70` to stat items to ensure sufficient space for longer labels.

### How Fixes Were Implemented
- Modified SafeAreaView component to exclude the bottom edge by adding the `edges` prop. This prevents SafeAreaView from adding bottom padding for the safe area (home indicator), which was creating double spacing with the tab bar's reserved space.

- Adjusted stats section layout to prevent text wrapping: Reduced `statsContainer` padding from 16 to 14 pixels to allocate more horizontal space to the stat items themselves. Reduced `statDivider` marginHorizontal from 8 to 6 pixels to minimize space taken by dividers. Added `minWidth: 70` to `statItem` style to ensure each stat container has sufficient width for longer labels like "Connections". This ensures all stat labels, including "Connections", fit on a single line.
