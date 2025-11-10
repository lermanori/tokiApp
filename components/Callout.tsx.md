# File: Callout.tsx

### Summary
This file contains the Callout component for displaying a single event's information in a map marker callout. It shows the event title, category, location, attendee count, and a "View Details" button.

### Fixes Applied log
- Refactored: Extracted single event callout UI from DiscoverMap.native.tsx into a separate reusable component.

### How Fixes Were Implemented
- Created a new Callout component that accepts an event prop
- Moved all single event callout rendering logic (title, category, location, attendees, button) from DiscoverMap.native.tsx
- Extracted the formatAttendees helper function into this component
- Maintained the same styling and layout as the original implementation
- The component is now reusable and easier to maintain/modify independently

