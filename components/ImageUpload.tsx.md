# File: ImageUpload.tsx

### Summary
This is a reusable component for image upload functionality. It handles image picking, cropping, and platform-specific upload logic. It supports both profile and toki image uploads with configurable endpoints and behaviors.

### Fixes Applied Log
- **Problem**: Image didn't refresh immediately after upload - required manual refresh to see the new image.
- **Solution**: Added local `displayImageUrl` state that updates immediately after successful upload, ensuring the UI refreshes instantly without waiting for parent component re-render or backend data refresh. The state syncs with the `currentImageUrl` prop via useEffect.

- **Problem**: "Take Photo" button was opening the photo library instead of the camera.
- **Solution**: Updated `handleImagePicker` to check the `useCamera` parameter and call `ImagePicker.launchCameraAsync()` when true, and `ImagePicker.launchImageLibraryAsync()` when false. Also updated `requestPermissions` to accept `useCamera` parameter and request camera permissions when using the camera.

- **Problem**: iOS upload was failing with "Empty file" error from Cloudinary after the crop modal changes.
- **Solution**: Changed iOS/React Native upload approach from FormData (which doesn't work reliably with local file URIs from ImageManipulator) to base64 + JSON, matching the web approach. Both platforms now convert the image to base64 using `ImageManipulator.manipulateAsync` with `base64: true` and send it as JSON with `Content-Type: application/json`.

- **Problem**: iOS profile image picker was showing deprecation warning: "ImagePicker.MediaTypeOptions have been deprecated".
- **Solution**: Changed `mediaTypes: 'Images'` to `mediaTypes: ['images']` (array format) in the `launchImageLibraryAsync` call, which is the modern API that works across all Expo SDK versions.

- **Problem**: iOS needs a delay before showing the crop modal to ensure smooth transition from image picker.
- **Solution**: Added platform-specific delay logic - iOS waits 500ms before showing the crop modal, while web/Android show immediately using `Platform.OS === 'ios'` check.

- **Problem**: iOS native photo picker was not opening - the modal was interfering with the picker launch.
- **Solution**: Added a 1000ms (1 second) delay after closing the options modal before launching the image picker on iOS (100ms on other platforms). This allows the modal animation to complete before the picker opens. Also added detailed permission logging and timeout detection to help debug picker issues.

### How Fixes Were Implemented
- **Problem**: After uploading an image (especially from camera), the component didn't show the new image immediately - users had to manually refresh to see the updated image.
- **Solution**:
  1. Added `displayImageUrl` local state to track the displayed image URL independently from the prop
  2. Added a `useEffect` hook to sync `displayImageUrl` with the `currentImageUrl` prop when it changes externally
  3. Updated `uploadImage` function to immediately set `displayImageUrl` to the new image URL after successful upload (before calling callbacks)
  4. Changed the render logic to use `displayImageUrl` instead of `currentImageUrl` for displaying the image
  5. Updated `handleRemoveImage` to clear `displayImageUrl` when removing an image
  6. This ensures instant UI updates without waiting for parent component re-renders or backend data refreshes

- **Problem**: The `handleImagePicker` function accepted a `useCamera` parameter but always called `ImagePicker.launchImageLibraryAsync()` regardless of the parameter value, causing "Take Photo" to open the library instead of the camera.
- **Solution**:
  1. Updated `requestPermissions` to accept a `useCamera` boolean parameter
  2. When `useCamera` is true, request camera permissions using `ImagePicker.getCameraPermissionsAsync()` and `ImagePicker.requestCameraPermissionsAsync()`
  3. When `useCamera` is false, request media library permissions (existing behavior)
  4. Updated `handleImagePicker` to conditionally call the appropriate ImagePicker method:
     - If `useCamera` is true: call `ImagePicker.launchCameraAsync()`
     - If `useCamera` is false: call `ImagePicker.launchImageLibraryAsync()`
  5. Updated the permission request call to pass the `useCamera` parameter to `requestPermissions`

- **Problem**: The iOS version was using FormData with a local file URI (`file:///...`) from `ImageManipulator`, which the FormData API couldn't read properly, resulting in an empty file being sent to Cloudinary.
- **Solution**:
  1. Removed the platform-specific FormData approach for React Native
  2. Updated the `else` block (React Native path) to use the same base64 conversion as web:
     - Call `ImageManipulator.manipulateAsync` with `base64: true`
     - Create upload data with `image: data:image/jpeg;base64,${base64}`
     - Send as JSON with `Content-Type: application/json` header
  3. Both web and iOS now follow the same upload flow, ensuring consistency
  4. The backend already supports JSON uploads (checks for `application/json` content-type and parses base64 data)
  5. Added comprehensive logging to track the conversion and upload process

### Platform Detection
- **Web**: Detected by `Platform.OS === 'web'` or presence of `window` and `document` objects
- **iOS/Android**: Everything else uses the React Native path
- Both platforms now use identical upload logic (base64 + JSON)

