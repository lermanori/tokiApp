# File: toki-backend/admin-panel/src/components/dashboard/NotificationScheduleTab.tsx

### Summary
Admin panel tab component for managing scheduled notifications. Displays a table of all scheduled notifications with ability to create, edit, delete, enable/disable, and test notifications.

### Fixes Applied log
- problem: No admin interface for managing scheduled notifications.
- solution: Created NotificationScheduleTab component with table view, CRUD operations, enable/disable toggle, and test functionality.

### How Fixes Were Implemented
- Displays scheduled notifications in a table with columns: Day, Time, Title, Message (truncated), Enabled, Last Sent, Actions.
- Includes Create button to open modal for new notifications.
- Each row has Test, Edit, and Delete buttons.
- Enable/Disable toggle button changes color based on status.
- Formats day names (Monday, Tuesday, etc.) and time (HH:MM) for display.
- Integrates with adminApi service for all CRUD operations.
- Uses NotificationScheduleModal component for create/edit forms.

