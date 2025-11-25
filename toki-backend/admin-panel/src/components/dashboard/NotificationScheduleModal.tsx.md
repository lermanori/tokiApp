# File: toki-backend/admin-panel/src/components/dashboard/NotificationScheduleModal.tsx

### Summary
Modal component for creating and editing scheduled notifications. Provides form fields for title, message, day of week, hour, minute, and enabled status.

### Fixes Applied log
- problem: No form interface for creating/editing scheduled notifications.
- solution: Created NotificationScheduleModal component with all required form fields and validation.

### How Fixes Were Implemented
- Form includes title (text input), message (textarea), day of week (dropdown), hour (0-23 dropdown), minute (0-59 in 5-minute increments), and enabled (checkbox).
- Supports both create and edit modes based on whether initial prop is provided.
- Validates required fields and sends data to adminApi service.
- Displays error messages if save fails.
- Uses glass-card styling consistent with other admin panel modals.

