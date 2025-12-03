# File: TokiHeader.tsx

### Summary
This file contains the TokiHeader component that displays the header section of a Toki event details page. It shows the event image, title, privacy badges, and action buttons (back, save, share) overlaid on the background image.

### Fixes Applied log
- **problem**: TokiHeader was rendering location, time, and attendee info overlaid on the background image instead of in the white details section.
- **solution**: Removed the info section (location, time, attendees) from TokiHeader and moved it to the details container in toki-details.tsx.

- **problem**: TokiHeader interface included unnecessary properties for location, time, and attendees that were no longer being used.
- **solution**: Cleaned up the interface to only include properties actually used by the header (id, title, image, category, visibility, isHostedByUser).

- **problem**: Unused imports and styles were cluttering the component.
- **solution**: Removed unused imports (MapPin, Clock, Users, formatLocationDisplay, formatTimeDisplay) and cleaned up unused styles (infoSection, infoItem, infoText).

### How Fixes Were Implemented
- **problem**: Simplified TokiHeader to focus only on visual header elements (image, title, badges, action buttons).
- **solution**: Removed all info section JSX and moved location, time, and attendee information to the white details section below the image.

- **problem**: Updated component interface to match actual usage.
- **solution**: Removed location, time, scheduledTime, attendees, and maxAttendees from the toki prop interface.

- **problem**: Cleaned up unused code and imports.
- **solution**: Removed unused icon imports and utility function imports, and deleted corresponding style definitions.

- **problem**: No way to see which friends are attending a toki in the header.
- **solution**: Added FriendsGoingOverlay component to display friends attending, with optional onPress handler to open friends modal.
