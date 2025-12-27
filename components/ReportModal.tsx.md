# File: ReportModal.tsx

### Summary
Reusable modal component for reporting content (Tokis, Users, Messages). Provides a consistent UI for entering report reasons with validation, character counter, and submission handling. Part of Apple App Review compliance Task 1.2.

### Fixes Applied
- Created: Reusable ReportModal component for all content types
- Added: Reason text input with 500 character limit and counter
- Added: Input validation before submission
- Added: Loading state during API calls
- Added: Success and error alert messages
- Added: Disabled state for submit button when empty or submitting

### How Fixes Were Implemented
- Uses React Native Modal with fade animation for smooth UX
- Props-based configuration for title, subtitle, and content type
- Character counter displays real-time count (X/500)
- onSubmit prop allows parent components to handle API calls
- Clears input and closes modal after successful submission
- Shows appropriate success message based on content type
- Styled consistently with existing app modals (similar to chat.tsx)
