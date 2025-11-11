### Summary
Filters modal component for Discover/Explore screens with basic and advanced filters. Added a “Max distance” control bound to `radius` (2–500 km) and kept category chip mirroring.

### Fixes Applied log
- problem: No direct numeric control for search radius; default changed to 500 km.
- solution: Added web range input and native stepper/progress for `radius` with clamping 2–500 km.
- problem: Slider used default browser blue styling on web.
- solution: Applied app purple using CSS `accent-color: #B49AFF` on the range input.

### How Fixes Were Implemented
- Introduced `radiusValue` and `setRadius` helpers, rendering a web `input[type="range"]` and native stepper with a progress track. Wired to `onFilterChange('radius', ...)`.
