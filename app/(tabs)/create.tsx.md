# File: create.tsx

### Summary
This screen allows users to create new Tokis. It displays a TokiForm component and handles the submission flow, including error handling with the new ErrorModal component.

### Fixes Applied log
- problem: Used native Alert.alert for error messages, providing inconsistent UX
- solution: Integrated ErrorModal component to display backend and validation errors with branded styling
- problem: Error handling didn't catch errors thrown from AppContext.createToki
- solution: Simplified error handling to catch thrown errors directly, removing null check logic

### How Fixes Were Implemented
- problem: Error handling was basic with Alert.alert calls that didn't show detailed error information
- solution: 
  - Added errorState to track modal visibility, title, message, details, and status code
  - Imported ErrorModal and parseApiError utilities
  - Simplified handleCreateToki to only use try/catch (removed if/else null check)
  - AppContext.createToki now throws errors instead of returning null on failure
  - Used parseApiError to normalize errors from backend with 'create' context
  - Set errorState when errors occur in catch block
  - Added onValidationError callback to TokiForm to handle client-side validation errors
  - Rendered ErrorModal at bottom of component tree with errorState props
  - Modal shows user-friendly error messages with optional bullet-point details for validation issues
  - Backend validation errors (e.g., "Max attendees must be between 1 and 100") now display correctly in ErrorModal
