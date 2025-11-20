# File: UsersTable.tsx

### Summary
This file contains the users table component in the admin panel. Displays all users with their details and allows management actions. Updated to show invitation credits and allow adding credits.

### Fixes Applied log
- Added invitation_credits to UserRow interface
- Added "Invitation Credits" column to table
- Added "Add Invitation Credits" button in actions column
- Integrated InvitationCreditsModal component
- Updated table to display credits as badge

### How Fixes Were Implemented
- Updated interface to include invitation_credits field
- Added new table column header for invitation credits
- Display credits as gradient badge in table rows
- Added button to open invitation credits modal
- Refreshes table after credits are added
