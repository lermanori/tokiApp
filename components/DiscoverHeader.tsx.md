# File: components/DiscoverHeader.tsx

### Summary
Gradient header for the Discover/Map screen with refresh, toggle map/list, and now Sort and Filters actions.

### Fixes Applied log
- problem: No affordance to open Sort modal from Discover header.
- solution: Added a Sort button (ArrowUpDown icon) and a new `onOpenSort` prop.

### How Fixes Were Implemented
- Extended `DiscoverHeaderProps` with `onOpenSort`.
- Inserted a Sort button between the map toggle and filters button, matching existing button styling.


