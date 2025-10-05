# File: components/DiscoverMap.native.tsx

### Summary
Native (react-native-maps) map component. Now uses shared `CATEGORY_COLORS` to color markers.

### Fixes Applied log
- problem: Color mapping was duplicated and included unused categories.
- solution: Replaced local switch with lookup into `CATEGORY_COLORS`.
- problem: Cluster callout only showed a generic "x events here" and a single button.
- solution: Cluster callout now lists the grouped events in a scrollable list; tapping a title opens the event.

### How Fixes Were Implemented
- Imported `CATEGORY_COLORS` from `utils/categories`.
- Simplified `getCategoryColorForMap` to use the shared color table.
- Updated `RNCallout` for groups: when `group.items.length > 1`, render a `ScrollView` of `TouchableOpacity` rows with `onPress={() => onEventPress(ev)}`. Maintained the single-event layout and button for the 1-item case.
