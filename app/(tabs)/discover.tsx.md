# File: app/(tabs)/discover.tsx

### Summary
This file contains the Discover/Map screen showing Tokis on a map view with filters and search functionality. Displays a map with Toki markers and allows filtering by category and location.

### Fixes Applied log
- problem: White space appeared above the tab bar on the Discover/Map screen.
- solution: Added `edges={['top', 'left', 'right']}` to SafeAreaView to exclude the bottom edge, preventing double spacing since the tab bar already handles bottom spacing.

### How Fixes Were Implemented
- Modified SafeAreaView component to exclude the bottom edge by adding the `edges` prop. This prevents SafeAreaView from adding bottom padding for the safe area (home indicator), which was creating double spacing with the tab bar's reserved space.
