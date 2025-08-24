# File: tokis.ts (Backend Routes)

### Summary
This file contains the backend API routes for Toki management including creation, updates, deletion, and completion.

### Fixes Applied log
- problem: Hosts needed a backend endpoint to mark Tokis as completed.
- solution: Added PUT /:id/complete route for completing Tokis with proper validation and status updates.

### How Fixes Were Implemented
- Added new route `PUT /:id/complete` for completing Tokis.
- Implemented proper authentication and authorization checks (only host can complete).
- Added validation to prevent completing already completed Tokis.
- Updates both the Toki status and all participant statuses to 'completed'.
- Returns standardized response format with completion confirmation.
- Includes comprehensive error handling and logging.
- This endpoint will be the trigger for the rating system, allowing participants to rate each other after events are completed.
