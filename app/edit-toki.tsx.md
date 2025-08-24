# File: edit-toki.tsx

### Summary
This file handles editing existing Toki events with form inputs for updating title, description, location, time, category, and attendee limits.

### Fixes Applied log
- problem: After editing a Toki, the app stayed on the edit screen instead of navigating to the updated Toki details.
- solution: Updated the submit flow to navigate immediately to the Toki details page using router.push instead of router.replace.

### How Fixes Were Implemented
- Changed navigation from `router.replace()` to `router.push()` to maintain proper navigation stack.
- Added immediate navigation to `/toki-details?tokiId=${tokiId}` after successful edit.
- This ensures users are taken directly to their updated Toki instead of staying on the edit form.
