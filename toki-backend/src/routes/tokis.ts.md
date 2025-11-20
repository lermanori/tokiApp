# File: toki.ts

### Summary
Backend routes for toki management including creation, updates, joining, and approval logic.

### Fixes Applied log
- problem: Support unlimited max attendees (NULL value)
- solution: Updated validation to allow null for maxAttendees, updated capacity checks to skip when max_attendees is NULL

- problem: Auto-approve join requests feature
- solution: Added autoApprove to request body, included in database operations, updated join logic to auto-approve when enabled

### How Fixes Were Implemented
- Updated max attendees validation to allow null (unlimited)
- Added autoApprove field to create and update endpoints
- Updated join endpoint to check auto_approve flag and automatically set status to 'joined' when enabled
- Updated capacity checks in join and approve endpoints to skip when max_attendees is NULL
- Added autoApprove to all response mappings
- Added notification for auto-approved users
