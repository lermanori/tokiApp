# File: edit-toki.tsx

### Summary
This screen allows users to edit existing Tokis they host. It loads the Toki data, displays a TokiForm in edit mode, and handles the update submission flow with error handling via ErrorModal.

### Fixes Applied log
- problem: Used native Alert.alert for error messages, providing inconsistent UX
- solution: Integrated ErrorModal component to display backend and validation errors with branded styling
- problem: Error handling didn't catch errors thrown from AppContext.updateTokiBackend
- solution: Simplified error handling to catch thrown errors directly, removing success boolean check logic

### How Fixes Were Implemented
- problem: Error handling was basic with Alert.alert calls that didn't show detailed error information
- solution:
  - Added errorState to track modal visibility, title, message, details, and status code
  - Imported ErrorModal and parseApiError utilities
  - Simplified handleUpdateToki to only use try/catch (removed if/else success check)
  - AppContext.updateTokiBackend now throws errors instead of returning false on failure
  - Used parseApiError to normalize errors from backend with 'edit' context
  - Set errorState when errors occur in catch block
  - Added onValidationError callback to TokiForm to handle client-side validation errors
  - Rendered ErrorModal at bottom of component tree with errorState props
  - Modal shows context-aware error messages (e.g., "Can't update Toki" for edit context)
  - Handles permission errors (403) with appropriate messaging about host-only updates
  - Backend validation errors now display correctly in ErrorModal
