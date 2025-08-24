# File: create.tsx

### Summary
This file handles the creation of new Toki events with form inputs for title, description, location, time, category, and attendee limits.

### Fixes Applied log
- problem: After creating a Toki, the app stayed on the create screen instead of navigating to the new Toki details.
- solution: Updated the submit flow to use the returned Toki ID from createToki action and navigate immediately using router.push instead of router.replace.

### How Fixes Were Implemented
- Modified the submit handler to capture the returned `tokiId` from `actions.createToki(newTokiData)`.
- Changed navigation from `router.replace()` to `router.push()` to maintain proper navigation stack.
- Added immediate navigation to `/toki-details?tokiId=${tokiId}` after successful creation.
- This ensures users are taken directly to their newly created Toki instead of staying on the create form.
