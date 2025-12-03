# File: auth.ts

### Summary
This file handles user authentication including login, registration, and password management. Added invitation-based registration endpoint that allows users to skip the waitlist.

### Fixes Applied log
- Added POST /register/invite endpoint for invitation-based registration
- Invited users are automatically verified and skip waitlist
- Invitation validation and status tracking
- problem: PUT /me endpoint didn't handle socialLinks, causing social links to not save when updating profile
- solution: Updated PUT /me endpoint to accept, validate, and process socialLinks. Added transaction support to ensure atomicity when updating both user fields and social links. Endpoint now returns social links in response.

### How Fixes Were Implemented
- Added new route handler that validates invitation codes before registration
- Checks invitation expiration and usage status
- Verifies email matches the invitation
- Marks invitation as accepted after successful registration
- Invited users are not auto-verified (sets verified = false, same as regular registration)
- Fixed social links handling in PUT /me by:
  - Adding `socialLinks` to request body type definition
  - Adding validation for social links (object type, valid platforms: instagram, tiktok, linkedin, facebook, URL length limits)
  - Using database transaction to ensure atomicity when updating user fields and social links
  - Deleting existing social links before inserting new ones (replace strategy)
  - Updating `updated_at` timestamp even when only social links change
  - Including social links in response by joining `user_social_links` table and using `json_object_agg` to aggregate links
  - Allowing saves when only social links change (no other fields) by checking both `hasUserFieldsToUpdate` and `hasSocialLinksToUpdate`
