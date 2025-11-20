# File: TokiForm.tsx

### Summary
This component provides a comprehensive form for creating and editing Tokis. It handles all input fields including title, description, location, activity types, time scheduling, max attendees, tags, images, and privacy settings. The form supports both create and edit modes with proper validation.

### Fixes Applied log
- problem: Newly created Tokis lacked their uploaded images/distance until a refresh because images were uploaded after creation and location data wasn't sent.
- solution: TokiForm now encodes selected images to base64 before submission, includes them (and the creator's coordinates) in the create payload, and eliminates the post-create upload step so the backend can return the final card immediately.
- problem: Validation errors used Alert.alert, inconsistent with new error modal approach
- solution: Added onValidationError callback prop to allow parent screens to handle validation errors via ErrorModal
- problem: Cloudinary image upload failed during toki creation (500 error) - used blob/FormData approach that doesn't work on web
- solution: Updated uploadImagesToToki to use ImageManipulator base64 conversion and JSON payload (same approach as edit mode)
- problem: Date and time pickers had bugs in dark mode, not working properly
- solution: Forced light mode styling on all date/time pickers by adding themeVariant="light" to RNDateTimePicker and explicit light theme styles to DateTimePicker components

### How Fixes Were Implemented
- Added a `prepareImagesForSubmission` helper that converts any local/temp images into base64 payloads (or reuses existing Cloudinary URLs) before calling `onSubmit`.
- Extended the submission payload with `images`, `userLatitude`, and `userLongitude`, enabling the backend to upload inline images and calculate distance in the initial response.
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
- problem: The uploadImagesToToki function was using fetch(image.url) to get a blob, then creating FormData. This approach failed on web platforms because local file URIs aren't always fetchable, and the backend expects either multipart/form-data (React Native) or JSON with base64 (Web)
- solution:
  - Added import for ImageManipulator from expo-image-manipulator
  - Replaced blob/FormData approach with ImageManipulator.manipulateAsync() to convert images to base64
  - Changed upload request to send JSON with base64 data URI (same format as edit mode in TokiImageUpload.tsx)
  - Added Content-Type: application/json header to ensure backend correctly identifies request type
  - Improved error handling to catch and log JSON parsing errors
  - This ensures consistent behavior across web and React Native platforms, matching the working edit mode implementation
- problem: Date and time picker controls (DateTimePicker and RNDateTimePicker) were adapting to system dark mode, causing display and usability issues in dark theme. Month navigation controls (arrows and month/year text) were not visible in dark mode on iOS. Hour controls in time picker were also not visible in dark mode.
- solution:
  - Added `themeVariant="light"` prop to RNDateTimePicker component to force light mode appearance on native platforms
  - Added `textColor="#1C1C1C"` prop to RNDateTimePicker for iOS spinner display to ensure hour/minute text is visible in dark mode
  - Fixed react-native-ui-datepicker styling by using correct style keys from the library's UI enum: `button_next`, `button_prev`, `button_next_image`, `button_prev_image` for navigation controls, `month_selector_label`, `year_selector_label` for month/year text, `header`, `days`, `weekdays`, `day`, `day_label`, `weekday_label` for calendar elements
  - Applied `tintColor: '#1C1C1C'` to button images to ensure navigation arrows are visible in dark mode
  - Wrapped web time picker (react-mobile-picker) in a View with explicit white background (#FFFFFF) to ensure consistent appearance
  - All pickers now display with light mode styling regardless of system theme, ensuring consistent user experience
