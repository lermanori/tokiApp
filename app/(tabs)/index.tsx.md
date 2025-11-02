# File: app/(tabs)/index.tsx

### Summary
This file contains the Explore screen (main tab) that displays Tokis and allows users to search, filter, and browse events. Shows a greeting header, search functionality, category filters, and a scrollable list of Toki cards.

### Fixes Applied log
- problem: White space appeared above the tab bar on the Explore screen.
- solution: Added `edges={['top', 'left', 'right']}` to SafeAreaView to exclude the bottom edge, preventing double spacing since the tab bar already handles bottom spacing.

### How Fixes Were Implemented
- Modified SafeAreaView component to exclude the bottom edge by adding the `edges` prop. This prevents SafeAreaView from adding bottom padding for the safe area (home indicator), which was creating double spacing with the tab bar's reserved space.

