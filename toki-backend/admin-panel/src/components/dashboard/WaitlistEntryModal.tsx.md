# File: WaitlistEntryModal.tsx

### Summary
Enhanced the Create User flow from a waitlist entry with an option to send a welcome password link so the user can set their own password, reusing the existing reset token mechanism.

### Fixes Applied log
- Added `sendWelcomeLink` checkbox; when selected, `sendWelcomeEmail` is suppressed to avoid duplicate emails.
- Request now supports `sendWelcomeLink` to instruct backend to issue and send the set-password link.

### How Fixes Were Implemented
- Extended the payload of `adminApi.createUserFromWaitlist` to include `sendWelcomeLink`.
- Updated UI to show both options with clear descriptions. 


