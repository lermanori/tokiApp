# File: services/api.ts

### Summary
This file contains the API service class for making HTTP requests to the backend, including all CRUD operations for tokis, users, connections, and messaging.

### Fixes Applied log
- **Profile update uses single endpoint**: Switched `updateProfile` to call `PUT /auth/me` and return `{ user }` payload.
- **Coordinates support**: `updateProfile` now supports sending `latitude` and `longitude` as part of the `User` partial.
- **Added remove participant API method**: Created `removeParticipant(tokiId: string, userId: string)` method to call the backend endpoint for removing participants.
- **Activity visibility methods**: Added `getMyActivity`, `getUserActivity`, `hideActivity`, and `showActivity` to support profile activity visibility feature.
- **Updated createToki type definition**: Added `placeId?: string | null` to createToki parameters to support placeId in coordinate data, matching edit mode behavior.

### How Fixes Were Implemented
- **Single endpoint profile update**: Changed `updateProfile` to call `/auth/me` and parse `response.data.user`.
- **Coordinate fields**: Leveraged existing `User` interface fields `latitude` and `longitude` for request/response.
- **New method**: Added `async removeParticipant(tokiId: string, userId: string): Promise<{ success: boolean; message: string }>` after the `getJoinRequests` method.
- **HTTP method**: Uses `DELETE` method to call `/tokis/${tokiId}/participants/${userId}` endpoint.
- **Return type**: Returns a promise with success status and message from the backend.
- **Error handling**: Leverages the existing `makeRequest` method which handles authentication and error responses.
- **Activity visibility**: Implemented four new methods that call `/api/activity` routes and return typed payloads; used POST to hide and DELETE to unhide; lists return arrays for rendering.
- **Type safety for coordinates**: Updated createToki method signature to accept `placeId?: string | null` and changed latitude/longitude types to allow `number | null` to match the data being sent from TokiForm, ensuring type safety when coordinates are included in create requests.