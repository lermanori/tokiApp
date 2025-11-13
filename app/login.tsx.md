# File: login.tsx

### Summary
This file contains the login and registration screen with enhanced autofill functionality and a comprehensive dev environment solution for faster development workflows.

### Fixes Applied log
- **problem**: Missing autofill support for password managers and iOS/Android autofill systems
- **solution**: Added comprehensive autofill attributes including `textContentType`, `autoComplete`, and proper keyboard types

- **problem**: No password visibility toggle for better user experience
- **solution**: Implemented password visibility toggle with eye icon that allows users to see their password while typing

- **problem**: Limited keyboard navigation between form fields
- **solution**: Added proper `returnKeyType` and `onSubmitEditing` handlers for better form flow

- **problem**: Chrome autofill not working and need dev environment solution
- **solution**: Implemented local storage-based autofill system with dev mode quick login buttons

- **problem**: Time-consuming manual login for multiple dev accounts
- **solution**: Created dev mode with pre-configured test users and one-click login functionality

- **problem**: White spaces appearing at the top and bottom of the screen in dev builds due to SafeAreaView default background
- **solution**: Restructured component hierarchy to wrap SafeAreaView inside LinearGradient instead of the other way around, allowing the gradient to extend into safe areas (status bar and home indicator areas)

### How Fixes Were Implemented
- **Autofill Integration**: Added `textContentType` for iOS (name, emailAddress, password/newPassword) and `autoComplete` for Android compatibility
- **Password Visibility**: Created a password container with toggle button using eye/hide emojis for intuitive UX
- **Form Navigation**: Implemented proper keyboard return types and submission handlers for seamless field navigation
- **Platform Optimization**: Used different `textContentType` values for login vs registration (password vs newPassword) to help password managers distinguish between scenarios
- **Dev Environment**: Added localStorage-based credential saving/loading with automatic form population
- **Quick Login**: Implemented dev mode with 4 pre-configured test users and one-click login buttons
- **Persistent State**: Credentials are automatically saved after successful login and restored on page load
- **Gradient Background Fix**: Moved LinearGradient to be the outermost wrapper component, with SafeAreaView nested inside. This ensures the gradient covers the entire screen including safe areas (status bar at top, home indicator at bottom), eliminating white spaces. The gradient now extends edge-to-edge while SafeAreaView handles content padding for safe areas.

- **problem**: After login, unlogged users sharing a toki-details link were redirected to explore page instead of staying on the toki-details page. This was caused by a race condition where the fast redirect in `_layout.tsx` would redirect to `/toki-details`, but then `login.tsx` would redirect to `/(tabs)`, causing the toki-details page to unmount.
- **solution**: Added a check in `login.tsx` to detect if the fast redirect has already happened (by checking if we're already on the target page). If we're already on the target page, skip the redirect to `/(tabs)` and just set the redirection state so RedirectionGuard can clear it. This prevents the race condition and allows users to stay on the toki-details page after login.

- **problem**: No way for users to recover forgotten passwords from the login screen
- **solution**: Added "Forgot Password?" link below password field that navigates to forgot-password page, styled with purple (#8B5CF6) to match admin panel design

- **problem**: Login screen was calling `/api/tokis` endpoint after authentication, which is not the centralized route and creates unnecessary API calls.
- **solution**: Removed `apiService.getTokis()` call from login flow. User stats come from `getCurrentUser()`, and tokis will be loaded by the discover screen using the centralized `/api/tokis/nearby` route via `loadNearbyTokis()` when the user navigates there. This eliminates unnecessary `/api/tokis` calls and ensures all tokis loading uses the centralized route.