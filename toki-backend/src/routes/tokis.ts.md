# File: toki-backend/src/routes/tokis.ts

### Summary
This file contains the backend API routes for managing Tokis (events/activities), including creation, retrieval, filtering, and nearby search functionality.

### Fixes Applied log

**2025-01-XX - Fixed toki loading bugs in /tokis/nearby endpoint**

- **problem**: Count query was missing critical filters (user blocking, hidden tokis, visibility) causing count mismatch (showing 31 instead of 33)
- **solution**: Added user blocking filters, hidden tokis filters, and visibility filters to the count query to match the main query exactly

- **problem**: Count query returned 33 but main query only returned 31 items - inconsistency between count and actual results
- **solution**: Updated count query to use the same JOINs and GROUP BY logic as the main query, ensuring the count matches exactly what would be returned. Used a subquery with the same GROUP BY columns to match the main query's behavior.

- **problem**: Missing error handling and debugging information for count vs actual results mismatch
- **solution**: Added comprehensive logging to track count query results, actual query results, and parameter usage for debugging

- **problem**: Count query didn't account for private tokis visibility rules
- **solution**: Added visibility filtering logic that respects private tokis (only shows to host/participants/invitees) and defaults to public-only for unauthenticated users

### How Fixes Were Implemented

1. **Count Query Filter Alignment**:
   - Added user blocking filters (`user_blocks` table) to exclude tokis where user has blocked the host or vice versa
   - Added hidden tokis filter (`toki_hidden_users` table) to exclude tokis the user has hidden
   - Added visibility filters to handle private tokis correctly (only show to host/participants/invitees)
   - For unauthenticated users, only show public tokis

2. **Logging and Debugging**:
   - Added debug logging for count query results including total count, user ID, and search parameters
   - Added logging for main query results comparing requested limit vs actual results, total count, and pagination info
   - This helps identify discrepancies between expected and actual counts

3. **Parameter Handling**:
   - Ensured limit parameter (default 20, max 100) is properly parsed and used
   - Frontend sends limit: 50 which is now properly respected
   - Added proper parameter counting to avoid SQL injection and parameter mismatch issues

### Technical Details

The `/tokis/nearby` endpoint now uses the same WHERE conditions, JOINs, and GROUP BY logic for both the count query and the main SELECT query, ensuring:
- Consistent filtering between count and results
- Accurate pagination information
- Proper handling of user-specific filters (blocking, hidden, visibility)
- Exact match between count and actual returned items

The count query now:
- Uses the same LEFT JOIN to users table as the main query
- Uses the same GROUP BY columns (t.id, u.name, u.avatar_url, t.latitude, t.longitude, t.image_urls)
- Includes all the same WHERE conditions:
  - Status = 'active'
  - Latitude/longitude checks
  - Scheduled time filtering (12 hour window)
  - Distance calculation (radius-based)
  - User blocking filters (if authenticated)
  - Hidden tokis filters (if authenticated)
  - Visibility filters (private tokis handling)
  - Category filter (if provided)
  - Time slot filter (if provided)

This ensures that if a toki would be filtered out or collapsed by the GROUP BY in the main query, it will also be excluded from the count, making the numbers perfectly consistent.
