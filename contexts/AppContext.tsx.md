# File: AppContext.tsx

### Summary
This file contains the global state management and API actions for the Toki app, including user management, Toki operations, messaging, and WebSocket handling.

### Fixes Applied log
- problem: createToki function returned boolean instead of the created Toki ID, preventing proper navigation after creation.
- solution: Changed createToki return type from `Promise<boolean>` to `Promise<string | null>` and updated implementation to return the new Toki ID.
- problem: Hosts needed a way to mark Tokis as completed to trigger the rating system.
- solution: Added completeToki action to AppContext for managing event completion state.

### How Fixes Were Implemented
- Modified the `createToki` function in `AppContextType` interface to return `Promise<string | null>` instead of `Promise<boolean>`.
- Updated the `createToki` implementation to return `newToki.id` on success and `null` on failure.
- This change enables the frontend to navigate directly to the newly created Toki's details page using the returned ID.
- Added `completeToki` action to the AppContextType interface for completing Tokis.
- Implemented the `completeToki` function that calls the backend API to mark a Toki as completed.
- Added proper error handling and logging for the completion process.
- This enables hosts to mark events as completed, which will be the trigger for the rating system.
