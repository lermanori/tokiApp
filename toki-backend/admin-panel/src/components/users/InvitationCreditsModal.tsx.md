# File: InvitationCreditsModal.tsx

### Summary
This file contains a modal component for admins to add invitation credits to users. Displays current credits and allows input of credits to add.

### Fixes Applied log
- Created new modal component for adding invitation credits
- Added form with number input for credits amount
- Added validation (1-1000 credits)
- Integrated with admin API to grant credits

### How Fixes Were Implemented
- Built modal with glass-morphism styling matching admin panel design
- Added current credits display with gradient styling
- Implemented form validation and error handling
- Added loading states during API calls
- Refreshes user list after successful credit addition

