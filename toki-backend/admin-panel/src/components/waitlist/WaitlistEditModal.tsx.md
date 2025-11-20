### Summary
Modal component to create or edit waitlist entries. Fields: Email, Location, Platform, Phone. Calls `adminApi.createWaitlistEntry` and `adminApi.updateWaitlistEntry`.

### Fixes Applied log
- Added inline validation: require Email.
- Added saving state and inline error surface.
- Supports both create and edit based on presence of `initial.id`.

### How Fixes Were Implemented
- Implemented a reusable modal with glassmorphism styling consistent with admin panel.
- On save, maps empty strings to `null` for optional fields and invokes the corresponding admin API method.
- On success, calls `onSaved` to refresh the table and closes the modal via parent.




