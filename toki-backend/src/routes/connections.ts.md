# File: toki-backend/src/routes/connections.ts

### Summary
This file contains the backend routes for managing user connections, including sending, accepting, declining, and retrieving connections for tokis.

### Fixes Applied log
- problem: getConnectionsForToki endpoint only allowed hosts to view connections, preventing public attendees from inviting users
- solution: Updated endpoint to allow both hosts and attendees of public tokis to view connections

### How Fixes Were Implemented
- problem: Modified permission check to verify if user is host OR public attendee
- solution: Added toki visibility check and participant status verification for public tokis

- problem: Updated error messages to reflect new permission model
- solution: Changed error message to indicate both hosts and public attendees can view connections

- problem: Enhanced endpoint to support collaborative inviting in public tokis
- solution: Added isPublicAttendee check that verifies user has 'approved' or 'joined' status in public tokis
- problem: Connection requests and accept/decline actions were not sending push notifications.
- solution: Added push notifications using `sendPushToUsers` when connection requests are sent and when they are accepted/declined.
- solution:
  - Imported `sendPushToUsers` from `../utils/push`.
  - On connection request: send push to recipient with title "New Connection Request" and requester name.
  - On accept/decline: fetch current user name and send push to requester with personalized message (e.g., "John accepted your connection request").
  - Push data includes type, source, and externalId for client navigation handling.