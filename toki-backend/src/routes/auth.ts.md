# File: auth.ts

### Summary
This file handles user authentication including login, registration, and password management. Added invitation-based registration endpoint that allows users to skip the waitlist.

### Fixes Applied log
- Added POST /register/invite endpoint for invitation-based registration
- Invited users are automatically verified and skip waitlist
- Invitation validation and status tracking

### How Fixes Were Implemented
- Added new route handler that validates invitation codes before registration
- Checks invitation expiration and usage status
- Verifies email matches the invitation
- Marks invitation as accepted after successful registration
- Auto-verifies invited users (sets verified = true)
