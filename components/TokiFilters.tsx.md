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
- problem: Date picker had bugs in dark mode, not working properly. Month navigation controls (arrows and month/year text) were not visible in dark mode on iOS.
- solution: Fixed react-native-ui-datepicker styling by using correct style keys from the library's UI enum: `button_next`, `button_prev`, `button_next_image`, `button_prev_image` for navigation controls, `month_selector_label`, `year_selector_label` for month/year text. Applied `tintColor: '#1C1C1C'` to button images to ensure navigation arrows are visible in dark mode.

### How Fixes Were Implemented
- Introduced `radiusValue` and `setRadius` helpers, rendering a web `input[type="range"]` and native `Slider` component. Installed `@react-native-community/slider` package and configured with `minimumTrackTintColor` and `thumbTintColor` set to app purple (#B49AFF). Added debounce mechanism using `useState` for local slider value and `useRef` with `setTimeout` to delay `onFilterChange` calls by 300ms, preventing value jumps while maintaining smooth visual feedback.
- problem: DateTimePicker component was adapting to system dark mode, causing display issues in dark theme. Month navigation controls were not visible.
- solution: Fixed by using correct style keys from react-native-ui-datepicker's UI enum: `button_next`, `button_prev`, `button_next_image`, `button_prev_image` for navigation controls with `tintColor: '#1C1C1C'`, `month_selector_label`, `year_selector_label` for month/year text, `header`, `days`, `weekdays`, `day`, `day_label`, `weekday_label` for calendar elements, all with explicit white backgrounds (#FFFFFF) and dark text colors (#1C1C1C, #666666) to ensure the picker always displays in light mode regardless of system theme
