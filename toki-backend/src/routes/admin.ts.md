# File: admin.ts

### Summary
This file handles admin authentication endpoints (login, me) and admin-only routes for managing the system. It includes middleware to verify admin role, endpoints for message reports management, and comprehensive waitlist management endpoints with pagination, filtering, statistics, user creation, and email sending capabilities.

### Fixes Applied log
- Added: GET /api/admin/analytics endpoint for dashboard analytics with time-series data

### How Fixes Were Implemented
- Added GET /api/admin/analytics endpoint that returns time-series data for:
  - Active users per day (users with updated_at in that day)
  - Total accounts per day (cumulative count)
  - Unique logins per day (users with updated_at on that day)
  - Tokis created per day
- Endpoint accepts `days` query parameter (default 30, max 365)
- Returns both time-series array and summary object with current values
- Handles missing dates by filling gaps in the time series
- Uses efficient SQL queries with proper date grouping and aggregation
