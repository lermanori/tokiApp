# File: set-password.tsx

### Summary
Public page for first-time password setup via a time-limited token. Reads `token` from the URL, collects a new password, and calls `POST /api/auth/reset-password` to finalize. Mirrors the reset flow, tailored for welcome links.

### Fixes Applied log
- Added a screen at `/set-password` using Expo Router with validation and submission UI.
- Integrated with `getBackendUrl()` to post to the backend auth endpoint.

### How Fixes Were Implemented
- Used `useLocalSearchParams()` to read the `token` query parameter.
- Performed minimal client-side checks (length and confirmation) before submitting to the backend.
- On success, routes the user to `/login`. 


