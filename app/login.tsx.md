# File: login.tsx

### Summary
This file contains the user login screen with authentication functionality.

### Fixes Applied log
- **problem**: Login screen had "Join the Waitlist" button that redirected to waitlist
- **solution**: Replaced waitlist button with "Sign Up" button that navigates to registration screen

### How Fixes Were Implemented
- Changed button text from "Join the Waitlist" to "Sign Up"
- Updated navigation from `/waitlist` to `/register`
- Renamed style references from `waitlistButton`/`waitlistButtonText` to `signUpButton`/`signUpButtonText`
- Updated comment to reflect sign up CTA instead of waitlist
