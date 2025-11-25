# File: toki-backend/admin-panel/src/services/adminApi.ts

### Summary
Frontend API service for admin panel that includes new methods for managing scheduled notifications.

### Fixes Applied log
- problem: No frontend API methods for scheduled notifications.
- solution: Added 6 new methods to adminApi object for notification schedule CRUD operations and testing.

### How Fixes Were Implemented
- getNotificationSchedule() - Fetches list of scheduled notifications with optional pagination.
- getNotificationScheduleEntry(id) - Fetches single notification by ID.
- createNotificationSchedule(data) - Creates new notification with title, message, day_of_week, hour, minute, enabled.
- updateNotificationSchedule(id, data) - Updates notification with partial data.
- deleteNotificationSchedule(id) - Deletes notification.
- testNotificationSchedule(id) - Sends test notification immediately.
- All methods use existing getAuthHeaders() and handleResponse() utilities.
- Follows same pattern as other admin API methods.
