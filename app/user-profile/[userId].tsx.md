# File: user-profile/[userId].tsx

### Summary
This file contains the user profile screen, displaying public user information, connection status, and allowing users to connect, message, report, or block other users. Enhanced with better feedback and feed refresh for Apple App Review compliance.

### Fixes Applied log
- **problem**: Block button was not visible in the UI (handleBlockUser existed but wasn't connected to any UI element)
- **solution**: Added "Block User" button below the "Report User" button, styled consistently with report button.

- **problem**: Unblock button was not shown when viewing a blocked user's profile
- **solution**: Added block status checking on profile load, and conditionally show "Block User" or "Unblock User" button based on current block status.

- **problem**: Block confirmation didn't inform users about instant content removal and team notification
- **solution**: Updated Alert.alert text to explicitly state immediate effects including content removal and team notification.

- **problem**: No feedback after successful block operation
- **solution**: Added Alert.alert with success message confirming block and content removal.

- **problem**: Feeds didn't refresh after blocking from profile screen
- **solution**: Added automatic feed refresh using actions.loadTokis() after successful block.

### How Fixes Were Implemented
- **Block/Unblock Button UI**:
  - Added UserX and UserCheck icons import from lucide-react-native
  - Added blockSection, blockButton, unblockButton styles
  - Positioned button directly below report button
  - Only shows when viewing another user's profile (not own profile)
  - Conditionally renders "Block User" (red) or "Unblock User" (green) based on isBlocked state

- **Block Status Checking**:
  - Added isBlocked state to track if current user has blocked the profile user
  - Added loadBlockStatus() function that calls apiService.checkBlockStatus()
  - Loads block status when profile loads (in useEffect)
  - Updates isBlocked state after block/unblock actions

- **Unblock Functionality**:
  - Added handleUnblockUser() function with confirmation dialog
  - Calls apiService.unblockUser() to remove block
  - Updates isBlocked state to false after successful unblock
  - Refreshes Tokis feed to show restored content

- **Enhanced Block Confirmation**:
  - Updated Alert.alert message to include "immediately" keyword
  - Added bullet points about instant content removal, connection removal, messaging prevention, and team notification
  - More comprehensive explanation of blocking effects

- **Success Feedback**:
  - Added Alert.alert after successful block API call
  - Message explicitly states "Their content has been removed from your feed"
  - Provides clear confirmation before navigating back

- **Feed Refresh**:
  - Calls actions.loadTokis() after successful block
  - Ensures Tokis feed reflects block immediately
  - User sees updated feed when they navigate back
