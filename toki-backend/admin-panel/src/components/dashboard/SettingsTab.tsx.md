# File: SettingsTab.tsx

### Summary
Admin Settings tab to manage password link expiry hours. Loads current hours from `/api/admin/settings/password-reset-expiry` and allows updating it.

### Fixes Applied log
- Added `SettingsTab` component with number input and save button.
- Displays loading, saved, and error states for good UX.

### How Fixes Were Implemented
- Integrated with `adminApi.getPasswordExpiry()` and `adminApi.updatePasswordExpiry(hours)`.
- Basic validation bounds (1–168 hours) on the input field before save. 


