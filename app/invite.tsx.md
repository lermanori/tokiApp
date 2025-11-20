# File: invite.tsx

### Summary
This file contains the invitation screen where users can send invitations to friends and view their sent invitations. Displays current invitation credits and invitation history.

### Fixes Applied log
- Created new invitation screen component
- Added form to send invitations with email input
- Added display of current invitation credits
- Added list of sent invitations with status (pending/accepted/expired)
- Integrated with invitation API endpoints

### How Fixes Were Implemented
- Built React Native screen with form and list components
- Added credit checking before allowing invitation sends
- Added status badges and date formatting for invitations
- Implemented loading states and error handling
- Added empty state when no invitations exist

