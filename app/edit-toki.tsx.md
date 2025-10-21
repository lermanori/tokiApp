# File: edit-toki.tsx

### Summary
This file handles editing existing Toki events with form inputs for updating title, description, location, time, category, and attendee limits.

### Fixes Applied log
-problem: After editing a Toki, the app stayed on the edit screen instead of navigating to the updated Toki details.
-solution: Updated the submit flow to navigate immediately to the Toki details page using router.push instead of router.replace.
-problem: When viewing updated Toki details, back button would go back to edit screen instead of home.
-solution: Added fromEdit parameter to navigation URL to indicate the source of navigation.
-problem: Time changes were not being saved when editing a Toki.
-solution: Fixed field mapping to use scheduledTime instead of customDateTime to match backend expectations.

### How Fixes Were Implemented
-Changed navigation from `router.replace()` to `router.push()` to maintain proper navigation stack.
-Added immediate navigation to `/toki-details?tokiId=${tokiId}&fromEdit=true` after successful edit.
-This ensures users are taken directly to their updated Toki instead of staying on the edit form.
-The fromEdit parameter allows the Toki details screen to handle back navigation appropriately.
-Fixed time field mapping: changed `customDateTime: tokiData.customDateTime` to `scheduledTime: tokiData.customDateTime` to match backend API expectations.