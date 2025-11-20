# File: admin.ts

### Summary
This file handles admin authentication endpoints (login, me) and admin-only routes for managing the system. It includes middleware to verify admin role, endpoints for message reports management, and comprehensive waitlist management endpoints with pagination, filtering, statistics, user creation, and email sending capabilities.

### Fixes Applied log
- Added: GET /api/admin/analytics endpoint for dashboard analytics with time-series data
- Enhanced: Updated endpoint to support hours parameter and hour-based grouping
- Enhanced: Replaced inaccurate updated_at-based tracking with proper activity logging from user_activity_logs table

### How Fixes Were Implemented
- Added GET /api/admin/analytics endpoint that returns time-series data for:
  - Active users per period (users who connected via WebSocket - event_type = 'connect' from user_activity_logs)
  - Total accounts per period (cumulative count from beginning using users.created_at)
  - Unique logins per period (actual login events - event_type = 'login' from user_activity_logs)
  - Tokis created per period (from tokis.created_at)
- Endpoint accepts `hours` query parameter (default 720 = 30 days, max 2160 = 90 days)
- Automatically groups by hour for ranges <= 72 hours (3 days), by day for longer ranges
- Uses PostgreSQL DATE_TRUNC('hour', ...) for hour-based grouping, DATE(...) for day-based
- Returns both time-series array and summary object with current values
- Handles missing periods by filling gaps in the time series
- Uses efficient SQL queries with proper date/time grouping and aggregation
- **Activity Tracking**: Now uses dedicated user_activity_logs table instead of users.updated_at for accurate metrics
  - Active Users: Tracks WebSocket connections (connect events)
  - Logins: Tracks actual authentication events (login events)
  - Both metrics now reflect real user activity, not profile updates
