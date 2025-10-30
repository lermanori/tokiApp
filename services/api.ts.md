# File: services/api.ts

### Summary
This file contains the API service class for making HTTP requests to the backend, including all CRUD operations for tokis, users, connections, and messaging.

### Fixes Applied log
- **Added remove participant API method**: Created `removeParticipant(tokiId: string, userId: string)` method to call the backend endpoint for removing participants.
- **Activity visibility methods**: Added `getMyActivity`, `getUserActivity`, `hideActivity`, and `showActivity` to support profile activity visibility feature.

### How Fixes Were Implemented
- **New method**: Added `async removeParticipant(tokiId: string, userId: string): Promise<{ success: boolean; message: string }>` after the `getJoinRequests` method.
- **HTTP method**: Uses `DELETE` method to call `/tokis/${tokiId}/participants/${userId}` endpoint.
- **Return type**: Returns a promise with success status and message from the backend.
- **Error handling**: Leverages the existing `makeRequest` method which handles authentication and error responses.
- **Activity visibility**: Implemented four new methods that call `/api/activity` routes and return typed payloads; used POST to hide and DELETE to unhide; lists return arrays for rendering.