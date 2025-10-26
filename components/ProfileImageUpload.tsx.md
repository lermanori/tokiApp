# File: ProfileImageUpload.tsx

### Summary
This file contains the ProfileImageUpload component for managing user profile images, including upload, cropping, and removal functionality.

### Fixes Applied log
- **problem**: Profile image picker was opening native selector but not proceeding to crop modal
- **solution**: Updated ProfileImageUpload to use the same safe image picker utility as TokiImageUpload

### How Fixes Were Implemented
- **problem**: ProfileImageUpload was using direct ImagePicker calls instead of safe utility
- **solution**:
  1. Imported `safeLaunchImageLibrary` and `safeLaunchCamera` utilities
  2. Added `pendingPickerAction` state to track which picker to launch
  3. Updated `handleImagePicker` to set pending action and close modal
  4. Added `handleModalDismiss` function to launch picker after modal dismissal
  5. Updated Modal `onRequestClose` and X button to call `handleModalDismiss`
  6. Used same safe approach as TokiImageUpload for consistency

### Technical Details
- Uses safe image picker utility that defers execution until modal is fully dismissed
- Implements image cropping with ImageCropModal
- Supports both camera and library image selection
- Includes image processing with ImageManipulator for optimization
- Uses Promise-based API with proper error handling
- Works reliably in Expo managed workflow without native linking
- Prevents double-tap issues with global `isPicking` flag
- Uses `InteractionManager.runAfterInteractions()` to ensure UI is ready
- Compatible with both Expo Go and development builds
- Consistent with TokiImageUpload implementation
