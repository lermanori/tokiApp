# File: login.tsx

### Summary
This file contains the login and registration screen for the Toki app. It handles user authentication, form validation, and provides a smooth user experience with loading states and error handling.

### Fixes Applied log
- **problem**: No specific error messaging for incorrect login credentials (401 errors)
- **solution**: Added comprehensive error handling with specific messages for authentication failures

### How Fixes Were Implemented
- **problem**: Users couldn't distinguish between different types of login errors
- **solution**: 
  1. Added `errorMessage` state to track and display error messages
  2. Updated error handling in the `handleAuth` function to specifically catch 401 errors and authentication-related errors
  3. Added UI component to display error messages with proper styling
  4. Clear error messages when switching between login/register modes
  5. Enhanced error detection to check for various authentication failure patterns

- **problem**: Error messages were only shown via Alert dialogs
- **solution**: Replaced Alert dialogs with inline error messages that are more user-friendly and don't interrupt the user flow

- **problem**: No visual feedback for authentication errors
- **solution**: Added styled error container with red accent border and clear typography to make errors highly visible
