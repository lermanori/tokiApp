# File: api.ts

### Summary
This file contains the API service class that handles all HTTP requests to the backend. Added invitation-related API methods for the frontend.

### Fixes Applied log
- Added sendInvitation method to send invitations
- Added getInvitations method to list user's invitations
- Added getInvitationCredits method to check available credits
- Added validateInvitationCode method to validate invitation codes
- Added registerWithInvitation method for invitation-based registration

### How Fixes Were Implemented
- Added new methods that call the /api/invitations endpoints
- Integrated invitation validation and registration flow
- All methods follow the existing API service pattern with proper error handling
