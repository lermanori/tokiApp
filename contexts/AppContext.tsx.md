# File: AppContext.tsx

### Summary
This file provides the global application context with state management and actions for Tokis, users, messages, connections, and other app features. It uses React's Context API and useReducer for state management.

### Fixes Applied log
- problem: createToki and updateTokiBackend were swallowing errors, preventing ErrorModal from displaying backend validation errors
- solution: Modified error handling to re-throw errors instead of returning null/false, allowing calling screens to catch and display errors in ErrorModal

### How Fixes Were Implemented
- problem: When backend returned validation errors (e.g., "Max attendees must be between 1 and 100"), the error was caught in AppContext and returned as null/false, losing error details
- solution:
  - In createToki: Changed catch block to re-throw error after logging and dispatching SET_ERROR action
  - In updateTokiBackend: Changed catch block to re-throw error after logging instead of returning false
  - This allows create.tsx and edit-toki.tsx to catch the thrown errors and use parseApiError to display them in ErrorModal
  - Maintains error logging and state updates while preserving error information for UI display
  - Calling screens now receive the full error object with status code and message from backend
