# File: ClusterCallout.tsx

### Summary
This file contains the ClusterCallout component for displaying multiple events in a clustered map marker callout using a gallery/carousel presentation. It shows one event at a time with navigation controls (left/right arrows), swipe gesture support, page indicators, and a page counter (e.g., "1 / 3").

### Fixes Applied log
- Refactored: Extracted cluster callout UI (multiple events) from DiscoverMap.native.tsx into a separate reusable component.
- Enhanced: Converted from scrollable list to gallery/carousel presentation with navigation controls.

### How Fixes Were Implemented
- Created a new ClusterCallout component that accepts an array of events and an onEventPress callback
- Moved all cluster callout rendering logic from DiscoverMap.native.tsx
- Implemented gallery presentation:
  - Added state management for current index tracking
  - Implemented horizontal ScrollView with pagingEnabled for swipe gestures
  - Added left/right navigation buttons (arrows) that appear conditionally
  - Added page indicator dots at the bottom showing current position
  - Added page counter in header (e.g., "1 / 3")
  - Each event is displayed one at a time in a card-like format
- Maintained CalloutSubview functionality for individual event selection
- Preserved the pendingSelectionRef logic for tracking which event was selected
- The component now provides a modern gallery experience with both button and swipe navigation

