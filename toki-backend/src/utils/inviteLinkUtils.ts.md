# File: inviteLinkUtils.ts

### Summary
Utility functions for handling toki invite links and participant management.

### Fixes Applied log
- problem: Capacity check fails for unlimited tokis (max_attendees = NULL)
- solution: Updated capacity check to skip when max_attendees is NULL or undefined

### How Fixes Were Implemented
- Modified addUserToToki function to check if max_attendees is NULL before performing capacity validation
- Allows unlimited participants when max_attendees is NULL


