# File: PasswordLinkModal.tsx

### Summary
Modal component for sending password reset/welcome links to users. Allows admins to select email templates and control whether to include the password link in the email.

### Fixes Applied log
- Added: New modal component for password link sending with template selection and link inclusion checkbox.

### How Fixes Were Implemented
- Created modal that loads email templates from the database.
- Provides dropdown to select a template (or use default).
- Includes checkbox to control whether the password link is included in the email.
- Calls `adminApi.issuePasswordLink` with selected template and `includeLink` flag.
- Displays generated link and copies it to clipboard on success.
- Shows template subject preview when a template is selected.

