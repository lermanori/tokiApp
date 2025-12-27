# File: connections.tsx

### Summary
This file contains the Connections screen UI, allowing users to view their connections, search for new people, manage pending requests, and block/unblock users. Enhanced with better feedback and feed refresh for Apple App Review compliance.

### Fixes Applied log
- **problem**: Block confirmation didn't inform users about instant content removal
- **solution**: Updated block modal text to explicitly state that content will be "immediately" removed and that the team will be notified.

- **problem**: No feedback after successful block operation
- **solution**: Added Alert.alert with success message confirming block and content removal.

- **problem**: Feeds didn't refresh after blocking, so blocked content might still appear
- **solution**: Added automatic feed refresh after blocking using Promise.all to refresh connections, blocked users list, and Tokis feed simultaneously.

### How Fixes Were Implemented
- **Enhanced Block Modal**:
  - Updated modalSubtext to include "immediately" keyword
  - Added bullet point about team notification
  - Clarified that all content is removed from feeds

- **Success Feedback**:
  - Added Alert.alert after successful block API call
  - Message explicitly states "Their content has been removed from your feed"
  - Provides clear confirmation to user

- **Feed Refresh**:
  - Uses Promise.all to refresh multiple data sources in parallel
  - Calls loadConnections(), loadBlockedUsers(), and actions.loadTokis()
  - Ensures UI reflects block immediately without manual refresh
