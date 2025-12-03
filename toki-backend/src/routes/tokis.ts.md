# File: toki-backend/src/routes/tokis.ts

### Summary
Backend routes for managing tokis including list endpoints, nearby search, and individual toki retrieval. Now includes friends attending data in list responses.

### Fixes Applied log
- **problem**: Friends attending data was not included in toki list endpoints, requiring separate API calls for each toki.
- **solution**: Added efficient batch query to fetch friends attending for all tokis in list responses, only when user is authenticated.

### How Fixes Were Implemented
- **problem**: Users couldn't see which friends are going to tokis in list views without additional API calls.
- **solution**: Added friends fetching logic to `/tokis/nearby` and `/tokis/` endpoints. Uses a single batch query with `ANY($2::uuid[])` to fetch all friends for all tokis at once, then groups them by toki_id in a Map. Only executes when userId is present (authenticated users). Added `friendsAttending` field to response objects.

- **problem**: `/tokis/nearby` endpoint was missing `joinStatus` field and `currentAttendees` was being returned as a string instead of a number.
- **solution**: Added LEFT JOIN to `toki_participants` to get user's join status. Added `join_status` calculation in SELECT clause using COALESCE with CASE statement to handle hosting status. Added `jp.status` to GROUP BY clause. Updated response mapping to include `joinStatus: row.join_status || 'not_joined'` and convert `currentAttendees: Number(row.current_attendees ?? 0)` to ensure it's always a number.
