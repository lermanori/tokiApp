# File: toki-backend/src/routes/admin.ts

### Summary
Admin API routes including new scheduled notifications endpoints for CRUD operations and test functionality.

### Fixes Applied log
- problem: No API endpoints for managing scheduled notifications.
- solution: Added 6 new endpoints: GET list, GET single, POST create, PUT update, DELETE, and POST test for scheduled notifications.

### How Fixes Were Implemented
- GET /api/admin/notification-schedule - Lists all scheduled notifications with pagination.
- GET /api/admin/notification-schedule/:id - Gets single notification by ID.
- POST /api/admin/notification-schedule - Creates new notification with validation.
- PUT /api/admin/notification-schedule/:id - Updates notification with partial updates.
- DELETE /api/admin/notification-schedule/:id - Deletes notification.
- POST /api/admin/notification-schedule/:id/test - Sends test notification immediately to all users.
- All endpoints require admin authentication via requireAdmin middleware.
- Validates day_of_week (0-6), hour (0-23), and minute (0-59) ranges.
- Test endpoint fetches all user IDs and uses sendPushToUsers utility.
