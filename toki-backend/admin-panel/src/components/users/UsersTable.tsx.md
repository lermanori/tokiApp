# File: UsersTable.tsx

### Summary
Enhanced the Users table with actions to send welcome or reset password links via the new admin endpoint. Now uses a modal for template selection and link inclusion control.

### Fixes Applied log
- Added buttons "Send Welcome Password Link" and "Send Reset Password Link" per user row.
- Replaced direct API calls with modal-based flow using `PasswordLinkModal` component.
- Modal allows selecting email templates and controlling whether to include the password link in the email.

### How Fixes Were Implemented
- Buttons now open `PasswordLinkModal` instead of directly calling the API.
- Modal handles template selection, link inclusion checkbox, and email sending.
- On success, the generated link is copied to clipboard and displayed in the modal. 


