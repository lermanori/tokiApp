# File: toki-backend/admin-panel/src/components/dashboard/Dashboard.tsx

### Summary
Main dashboard component for admin panel that includes tabs for different admin functions, now including Notification Schedule tab.

### Fixes Applied log
- problem: No Notification Schedule tab in admin dashboard.
- solution: Added Notification Schedule tab with Bell icon, imported component, and added to activeTab type and rendering.

### How Fixes Were Implemented
- Added Bell icon import from lucide-react.
- Imported NotificationScheduleTab component.
- Added 'notification-schedule' to activeTab type union.
- Added TabButton for Notification Schedule with Bell icon.
- Added conditional rendering for NotificationScheduleTab when activeTab is 'notification-schedule'.
- Follows same pattern as other tabs (Analytics, Waitlist, Database, etc.).
