### Summary
Filters modal component for Discover/Explore screens with basic and advanced filters. Added a "Max distance" control bound to `radius` (2–500 km) and kept category chip mirroring.

### Fixes Applied log
- problem: No direct numeric control for search radius; default changed to 500 km.
- solution: Added web range input and native slider for `radius` with clamping 2–500 km.
- problem: Slider used default browser blue styling on web.
- solution: Applied app purple using CSS `accent-color: #B49AFF` on the range input.
- problem: Native iOS stepper looked non-native and inconsistent.
- solution: Replaced custom stepper with `@react-native-community/slider` for native iOS/Android experience, styled with purple (#B49AFF) track and thumb.
- problem: Slider value could jump back due to immediate filter updates causing state conflicts.
- solution: Added 300ms debounce to filter updates. Slider updates local state immediately for smooth visual feedback, but actual filter change is debounced until user stops sliding.

### How Fixes Were Implemented
- Introduced `radiusValue` and `setRadius` helpers, rendering a web `input[type="range"]` and native `Slider` component. Installed `@react-native-community/slider` package and configured with `minimumTrackTintColor` and `thumbTintColor` set to app purple (#B49AFF). Added debounce mechanism using `useState` for local slider value and `useRef` with `setTimeout` to delay `onFilterChange` calls by 300ms, preventing value jumps while maintaining smooth visual feedback.
