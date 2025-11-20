# File: adminApi.ts

### Summary
This file contains the admin API service that handles all API calls to the backend with JWT authentication. It provides methods for managing waitlist, users, tokis, algorithm hyperparameters, email templates, settings, and analytics.

### Fixes Applied log
- Added: getAnalytics method to fetch analytics dashboard data

### How Fixes Were Implemented
- Added getAnalytics method that accepts optional days parameter
- Calls GET /api/admin/analytics endpoint with query parameter
- Uses standard authentication headers and response handling
- Returns analytics data with time-series and summary information
