# File: invitations.ts

### Summary
This file contains the invitation system routes for sending invitations, listing user invitations, validating invitation codes, and checking invitation credits. Users can invite others to join Toki, and invited users can skip the waitlist.

### Fixes Applied log
- Created new route file for invitation management system
- Implemented POST endpoint to send invitations (checks credits, generates unique codes, sends emails)
- Implemented GET endpoint to list user's sent invitations
- Implemented GET endpoint to validate invitation codes (public)
- Implemented GET endpoint to check user's invitation credits

### How Fixes Were Implemented
- Added invitation sending logic with credit validation and decrement
- Added email integration using Resend API for sending invitation links
- Added 30-day expiration on invitations
- Added validation to prevent duplicate invitations and inviting existing users
- Generated unique 64-character hex codes for invitation links
- Fixed TypeScript compilation errors by adding return statements to all response handlers

