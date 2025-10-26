# File: TokiImageUpload.tsx

### Summary
This component handles uploading and managing multiple images for Toki events. It supports both "create" mode (where images are stored locally until the Toki is created) and "edit" mode (where images are immediately uploaded to the backend via the `/api/toki-images/upload/:tokiId` endpoint).

### Fixes Applied Log
- **Problem**: Images were not being uploaded to the backend when added in edit mode (e.g., from toki-details screen).
- **Solution**: Added `uploadImageToBackend` function that handles platform-specific uploads (base64 JSON for web, FormData for React Native). Modified `handleCropComplete` to check the mode and tokiId, and if in edit mode with a valid tokiId, it immediately uploads the cropped image to the backend and updates the UI with the returned Cloudinary URL and publicId.

- **Problem**: Clicking the trash icon only removed images locally, not from the backend/Cloudinary.
- **Solution**: Updated `handleRemoveImage` to call the backend delete endpoint `/api/toki-images/delete/:tokiId/:publicId` for real uploaded images. For temporary images (with `temp_` prefix) or when no tokiId exists, it still removes locally only.

- **Problem**: Trash icon was not clickable/responding to touch events.
- **Solution**: Removed `overflow: 'hidden'` from `imageContainer` style (which was clipping the button), added `zIndex: 10` and `elevation: 5` to `removeButton` to ensure it's on top, moved `borderRadius` to the `image` style itself to maintain rounded corners, and added comprehensive debug logging to track delete operations.

- **Problem**: Delete confirmation used platform-specific alerts (Alert.alert on native, window.confirm on web) which were inconsistent.
- **Solution**: Created a custom delete confirmation modal that works consistently across both web and native platforms. The modal features a clean design with an alert icon, title, message, and Cancel/Remove buttons. Uses React Native's Modal component with transparent overlay and fade animation.

- **Problem**: iOS toki image upload was failing with "Empty file" error from Cloudinary, using FormData with local file URIs that couldn't be read properly.
- **Solution**: Changed iOS/React Native upload approach from FormData to base64 + JSON (matching the web approach). Both platforms now convert the image to base64 using `ImageManipulator.manipulateAsync` with `base64: true` and send it as JSON with `Content-Type: application/json`. This ensures the file content is properly read and transmitted to the backend.

### How Fixes Were Implemented
- **Problem**: The component was only adding images locally with temporary IDs, regardless of mode.
- **Solution**: 
  1. Added imports for `Platform`, `ImageManipulator`, `getBackendUrl`, and `apiService`.
  2. Created `uploadImageToBackend` function that:
     - Detects platform (web vs React Native)
     - For web: converts image to base64 using `ImageManipulator` and sends as JSON
     - For React Native: converts to blob and sends as FormData
     - Calls `/api/toki-images/upload/:tokiId` with proper authentication
     - Returns the uploaded image object with Cloudinary URL and publicId
  3. Modified `handleCropComplete` to:
     - Check if `mode === 'edit' && tokiId` exists
     - If yes, call `uploadImageToBackend` and update the images list with the backend response
     - If no (create mode), add locally with temp ID as before
  4. Modified `handleRemoveImage` to:
     - Check if the image is temporary (starts with `temp_`) or no tokiId exists
     - If temporary or no tokiId: remove locally only
     - If real uploaded image: call DELETE endpoint `/api/toki-images/delete/:tokiId/:publicId`
     - Show loading state during deletion
     - Display success/error alerts based on backend response
  5. Added comprehensive logging to track the upload/delete flow and debug issues.
