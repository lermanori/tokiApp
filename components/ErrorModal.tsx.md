# File: ErrorModal.tsx

### Summary
This component provides a cross-platform, reusable error modal with branded styling for displaying error messages throughout the app. It shows an error icon, title, message, optional bullet-point details, and action buttons in a styled modal overlay.

### Fixes Applied log
- problem: Need stylish, cross-platform error display instead of native Alert.alert
- solution: Created ErrorModal component with branded styling matching InviteModal and ParticipantsModal design patterns

### How Fixes Were Implemented
- problem: Native Alert.alert doesn't provide consistent styling across platforms and lacks detail display
- solution: Implemented ErrorModal with:
  - Modal backdrop with semi-transparent overlay
  - Styled container with error icon (AlertCircle) in red accent color
  - Title and message text with proper typography hierarchy
  - Optional details section with bullet points for validation errors
  - Debug info showing status code in development mode
  - Action buttons: optional primary CTA and "Got it" secondary button
  - Responsive layout with ScrollView for long content
  - Consistent styling using app's color palette (#B49AFF, #EF4444, etc.)

