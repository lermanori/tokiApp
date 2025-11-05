# File: edit-profile.tsx

### Summary
This screen allows users to edit their profile details, including avatar, name, bio, location (with current location support), and social media links. It validates that at least one social link is provided and saves the updates through app context actions.

### Fixes Applied log
- problem: After a successful save, the screen showed a confirmation alert requiring an extra tap to go back.
- solution: Navigate back automatically on successful save without showing the success alert.
- problem: Clearing the location text was tedious with no quick way to reset.
- solution: Added a clear (×) button next to the location input to instantly clear the field and reset stored coordinates.

### How Fixes Were Implemented
- Changed `handleSave` success branch to call `router.back()` immediately after a successful `actions.updateProfile(...)` and removed the success `Alert.alert`. This streamlines the UX to return the user to their profile as soon as the save completes successfully.
- Implemented `handleClearLocation` to set `location` to an empty string and reset `latitude` and `longitude`. Rendered a small clear button when `profile.location` is non-empty, and added `clearButton`/`clearText` styles to keep visual consistency with existing UI controls.

