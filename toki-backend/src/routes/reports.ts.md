# File: reports.ts

### Summary
Backend router for handling content reports (Tokis and Users). Implements three endpoints for reporting content, with validation, duplicate checking, and logging. Part of Apple App Review compliance Task 1.2.

### Fixes Applied
- Created: POST /api/reports/tokis/:tokiId - Report a Toki
- Created: POST /api/reports/users/:userId - Report a user profile  
- Created: GET /api/reports/my-reports - Get user's own reports
- Added: Reason validation (required, max 500 chars)
- Added: Self-reporting prevention
- Added: Duplicate report checking
- Added: Comprehensive logging for all reports

### How Fixes Were Implemented
- Validates reason is provided and under 500 characters
- Checks that reported content exists in database
- Prevents users from reporting their own content or themselves
- Uses unique index constraint to prevent duplicate pending reports
- Logs all reports with content details for admin review
- Returns appropriate HTTP status codes and error messages
