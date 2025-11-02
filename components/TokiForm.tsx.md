# File: TokiForm.tsx

### Summary
This component provides a comprehensive form for creating and editing Tokis. It handles all input fields including title, description, location, activity types, time scheduling, max attendees, tags, images, and privacy settings. The form supports both create and edit modes with proper validation.

### Fixes Applied log
- problem: Validation errors used Alert.alert, inconsistent with new error modal approach
- solution: Added onValidationError callback prop to allow parent screens to handle validation errors via ErrorModal

### How Fixes Were Implemented
- problem: Form validation errors were displayed via Alert.alert, not matching the new branded error modal UX
- solution:
  - Added optional onValidationError prop to TokiFormProps interface (callback that receives string array of error details)
  - Modified handleSubmit validation logic to collect missing fields into a missingFields array
  - When validation fails, check if onValidationError callback is provided:
    - If yes: call onValidationError(missingFields) to let parent handle display via ErrorModal
    - If no: fall back to Alert.alert for backward compatibility
  - Applied same pattern for connection error handling
  - Parent screens (create.tsx, edit-toki.tsx) now provide onValidationError callback that sets errorState for ErrorModal display
  - Validation errors now show as bullet points in ErrorModal with clear, actionable messages
