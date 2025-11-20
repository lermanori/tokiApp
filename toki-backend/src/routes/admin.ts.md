# File: admin.ts

### Summary
This file contains admin routes for managing users, waitlist, and system settings. Added functionality to grant invitation credits to users and display credits in user list.

### Fixes Applied log
- Added POST /users/:id/invitation-credits endpoint to grant credits to users
- Updated GET /users endpoint to include invitation_credits in response

### How Fixes Were Implemented
- Added admin route to add invitation credits (adds to existing credits)
- Updated user list query to SELECT invitation_credits column
- Added validation for credits amount (must be positive number)
