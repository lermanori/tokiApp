# File: set-password.tsx

### Summary
Public page for first-time password setup via a time-limited token. Reads `token` from the URL, collects a new password, and calls `POST /api/auth/reset-password` to finalize. Mirrors the reset flow, tailored for welcome links. Includes error handling for expired tokens with a "Resend Link" feature that sends a new password link to the user's email.

### Fixes Applied log
- Added a screen at `/set-password` using Expo Router with validation and submission UI.
- Integrated with `getBackendUrl()` to post to the backend auth endpoint.
- Added expired token error handling with resend link functionality.
- Implemented error state management to show custom UI for expired tokens.
- Added resend link handler that calls `/api/auth/resend-password-link` endpoint.

- **problem**: UI didn't match admin panel design system and used basic styling
- **solution**: Updated to glassmorphism design with purple gradient background, translucent cards, and purple buttons matching admin panel aesthetics

- **problem**: Password set success required user to click OK button in alert before redirecting to login
- **solution**: Changed to automatically redirect to login page immediately upon successful password set for better user experience

### How Fixes Were Implemented
- Used `useLocalSearchParams()` to read the `token` query parameter.
- Performed minimal client-side checks (length and confirmation) before submitting to the backend.
- On success, automatically routes the user to `/login` using `router.replace('/login')` without requiring user interaction.
- Error handling: Detects `error: 'Reset token expired'` from backend response and sets error state instead of showing generic Alert.
- Error state UI: When token is expired, shows a custom screen with error message and "Resend Link" button, styled with admin panel design.
- Resend functionality: `handleResendLink()` function calls backend endpoint to generate and send a new password link.
- Loading states: Shows loading spinner in button during resend request.
- Success state: Displays confirmation message when new link is successfully sent.
- Backend endpoint `/api/auth/resend-password-link` handles token lookup (even if expired), determines link purpose (welcome vs reset), generates new token, and sends appropriate email.
- **UI Design**: Implemented LinearGradient with admin panel colors (#FFF1EB, #F3E7FF, #E5DCFF), translucent white cards with rgba(255, 255, 255, 0.95) background, purple shadows (#8B5CF6), and consistent button styling matching forgot-password and reset-password pages.
- **Layout**: Added SafeAreaView, KeyboardAvoidingView, and ScrollView for proper responsive behavior and keyboard handling. 


