### Summary
Adds create, edit, and delete controls to the Waitlist Management table. Integrates a new `WaitlistEditModal` and wires actions to admin API.

### Fixes Applied log
- Added “New Entry” button in header.
- Added “Edit” and “Delete” buttons in each row.
- Wired delete to `adminApi.deleteWaitlistEntry` with confirmation and table refresh.
- Integrated `WaitlistEditModal` for create/edit flows.

### How Fixes Were Implemented
- Imported `WaitlistEditModal` and introduced local `editOpen` state to manage create vs edit.
- On save/delete, reuses existing `loadWaitlist()` to refresh entries and pagination.
- Kept existing `WaitlistEntryModal` for view/create-user/email actions to avoid overlap.


