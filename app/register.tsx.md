# File: register.tsx

### Summary
This file contains the user registration screen that allows users to create accounts. It supports both direct registration and silent invitation-based registration (via URL parameters).

### Fixes Applied log
- **problem**: Registration required invitation code and showed invitation-related UI elements
- **solution**: Removed all invitation UI elements, made invitation code support silent (only via URL), and enabled direct registration as the default flow

- **problem**: Email field was disabled when coming from invitation
- **solution**: Made email field always editable for all users

- **problem**: Registration redirected to waitlist if no invitation code
- **solution**: Removed waitlist redirects and enabled direct registration without invitation

- **problem**: Registration flow showed validation screens and invitation banners
- **solution**: Removed all invitation validation UI, loading states, and banners - invitation support is now completely hidden

### How Fixes Were Implemented
- Removed `validating` state and `validateInvitation` function that showed loading/error screens
- Removed `invitationInfo` state and invitation banner UI component
- Removed early return screens that blocked registration without invitation code
- Updated `handleRegister` to silently check for invitation code in URL parameters and use invitation flow if present, otherwise use direct registration
- Made email field always editable by removing `editable={false}` and adding `onChangeText={setEmail}`
- Updated registration logic to use `apiService.register()` for direct sign ups and `apiService.registerWithInvitation()` only when invite code is silently detected in URL
- Invitation codes are still supported for backwards compatibility but are completely hidden from the UI
