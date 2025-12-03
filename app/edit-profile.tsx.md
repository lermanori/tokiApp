# File: edit-profile.tsx

### Summary
This screen allows users to edit their profile details, including avatar, name, bio, location (with current location support and address autocomplete), and social media links. It validates that at least one social link is provided and saves the updates through app context actions.

### Fixes Applied log
- problem: After a successful save, the screen showed a confirmation alert requiring an extra tap to go back.
- solution: Navigate back automatically on successful save without showing the success alert.
- problem: Clearing the location text was tedious with no quick way to reset.
- solution: Added a clear (×) button next to the location input to instantly clear the field and reset stored coordinates.
- problem: Manually typing a location did not update coordinates unless "Use current" was tapped.
- solution: Integrated a dropdown address autocomplete. On selection, we set both the display label and latitude/longitude.
- problem: Need to trace location change flow from profile update to exMap reload for debugging
- solution: Added 🔄 [FLOW-1] logs in useCurrentLocation (when location set in local state) and handleSave (when saving to backend) to track the start of the location update flow

### How Fixes Were Implemented
- Changed `handleSave` success branch to call `router.back()` immediately after a successful `actions.updateProfile(...)` and removed the success `Alert.alert`. This streamlines the UX to return the user to their profile as soon as the save completes successfully.
- Implemented `handleClearLocation` to set `location` to an empty string and reset `latitude` and `longitude`. Rendered a small clear button when `profile.location` is non-empty, and added `clearButton`/`clearText` styles to keep visual consistency with existing UI controls.
- Added `LocationAutocomplete` below the location input. On text edits (≥2 chars), we call `geocodingService.geocodeAddress` (debounced) to fetch suggestions, show the dropdown, and on selection we:
  - Format the chosen place using `geocodingService.formatConciseAddress`
  - Persist both `location` and coordinates (`latitude`, `longitude`) in local state
  - Hide the dropdown
  - We also clear stale coordinates when the user types manually until a suggestion is picked or current location is used.

