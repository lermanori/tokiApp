# File: AppContext.tsx

### Summary
This file provides the global application context with state management and actions for Tokis, users, messages, connections, and other app features. It uses React's Context API and useReducer for state management.

### Fixes Applied log
- problem: createToki and updateTokiBackend were swallowing errors, preventing ErrorModal from displaying backend validation errors
- solution: Modified error handling to re-throw errors instead of returning null/false, allowing calling screens to catch and display errors in ErrorModal
- problem: Coordinates (latitude/longitude) were not being sent when creating tokis, causing different coordinates than edit mode
- solution: Added latitude, longitude, and placeId fields to apiTokiData object in createToki function to match edit mode behavior

### How Fixes Were Implemented
- problem: When backend returned validation errors (e.g., "Max attendees must be between 1 and 100"), the error was caught in AppContext and returned as null/false, losing error details
- solution:
  - In createToki: Changed catch block to re-throw error after logging and dispatching SET_ERROR action
  - In updateTokiBackend: Changed catch block to re-throw error after logging instead of returning false
  - This allows create.tsx and edit-toki.tsx to catch the thrown errors and use parseApiError to display them in ErrorModal
  - Maintains error logging and state updates while preserving error information for UI display
  - Calling screens now receive the full error object with status code and message from backend
- problem: The createToki function was not including latitude, longitude, and placeId in the apiTokiData object sent to the backend, even though TokiForm was providing these values. This caused created tokis to have null coordinates while edited tokis had proper coordinates.
- solution:
  - Added latitude: tokiData.latitude || null to apiTokiData in createToki function
  - Added longitude: tokiData.longitude || null to apiTokiData in createToki function
  - Added placeId: tokiData.placeId || null to apiTokiData in createToki function
  - Updated apiService.createToki type definition to include placeId?: string | null for type safety
  - Now create and edit modes both send coordinates consistently to the backend
