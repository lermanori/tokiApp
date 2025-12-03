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
- problem: Save button was disabled until social links changed, even when location or other fields were modified.
- solution: Implemented proper change detection that compares current profile to original across all editable fields (avatar, name, bio, location, coordinates, and social links). Added `checkForChanges` helper function and `useEffect` to automatically update `hasChanges` state when any field differs from original.
- problem: Save button didn't provide clear feedback about why it was disabled (missing social links, no changes, no connection).
- solution: Added `canSave()` helper and `getSaveButtonText()` function to show descriptive button text: "Add Social Link" when social links are missing, "No Changes" when nothing changed, "No Connection" when offline, "Saving..." during save, and "Save" when ready.

### How Fixes Were Implemented
- Changed `handleSave` success branch to call `router.back()` immediately after a successful `actions.updateProfile(...)` and removed the success `Alert.alert`. This streamlines the UX to return the user to their profile as soon as the save completes successfully.
- Implemented `handleClearLocation` to set `location` to an empty string and reset `latitude` and `longitude`. Rendered a small clear button when `profile.location` is non-empty, and added `clearButton`/`clearText` styles to keep visual consistency with existing UI controls.
- Added `LocationAutocomplete` below the location input. On text edits (≥2 chars), we call `geocodingService.geocodeAddress` (debounced) to fetch suggestions, show the dropdown, and on selection we:
  - Format the chosen place using `geocodingService.formatConciseAddress`
  - Persist both `location` and coordinates (`latitude`, `longitude`) in local state
  - Hide the dropdown
  - We also clear stale coordinates when the user types manually until a suggestion is picked or current location is used.
- Fixed change detection by:
  - Adding `originalProfile` state to store the initial profile data
  - Creating `checkForChanges` helper function that compares all editable fields (avatar, name, bio, location, latitude, longitude, and all social link platforms) between current and original profiles
  - Adding `useEffect` hook that runs whenever `profile` or `originalProfile` changes to automatically update `hasChanges` state
  - Resetting `hasChanges` to `false` when profile is reset from `state.currentUser` updates
  - Removing manual `setHasChanges(true)` calls from `updateProfile` and `updateSocialLink` since the `useEffect` now handles this automatically
- Improved button UX by:
  - Adding `canSave()` helper function that checks all conditions (social links, connection, changes, saving state)
  - Adding `getSaveButtonText()` function that returns descriptive text based on current state
  - Updating button to use `canSave()` for disabled state and `getSaveButtonText()` for button text
  - Button now clearly communicates why it's disabled: "Add Social Link", "No Changes", "No Connection", or "Saving..."

