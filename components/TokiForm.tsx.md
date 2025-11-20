# File: TokiForm.tsx

### Summary
Form component for creating and editing tokis with all required fields and validation.

### Fixes Applied log
- problem: Need unlimited participants option with toggle
- solution: Added isUnlimited state and toggle button that hides input when enabled, sends null for maxAttendees

- problem: Need auto-approve toggle for join requests
- solution: Added autoApprove state and toggle UI similar to privacy toggle

### How Fixes Were Implemented
- Added isUnlimited state to track unlimited participants mode
- Added unlimited toggle button that hides max attendees input when enabled
- Added unlimited indicator showing infinity symbol when unlimited
- Added autoApprove toggle section with hint text explaining the feature
- Updated handleSubmit to send null for maxAttendees when unlimited
- Updated handleSubmit to include autoApprove in tokiData
- Updated useEffect to handle maxAttendees being null in edit mode
- Added styles for unlimited toggle and auto-approve toggle
