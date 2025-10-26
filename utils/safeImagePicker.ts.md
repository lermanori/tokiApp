# File: safeImagePicker.ts

### Summary
This file contains safe utility functions for launching image pickers that work reliably on iOS by ensuring they're only called after modals are fully dismissed.

### Fixes Applied log
- **problem**: ImagePicker hanging indefinitely on iOS when called from within a modal
- **solution**: Created safe wrapper functions that use InteractionManager and timeout delays

### How Fixes Were Implemented
- **problem**: iOS modal presentation conflicts with ImagePicker native calls
- **solution**:
  1. Added `InteractionManager.runAfterInteractions()` to wait for UI interactions to complete
  2. Implemented 100ms timeout to ensure modal is fully dismissed
  3. Added global `isPicking` flag to prevent double-tap issues
  4. Used proper error handling with try/catch blocks
  5. Used `MediaTypeOptions.Images` with `selectionLimit: 1` for better compatibility

### Technical Details
- Uses `InteractionManager.runAfterInteractions()` to defer execution until UI is ready
- Implements 100ms timeout to ensure modal dismissal is complete
- Global `isPicking` flag prevents multiple simultaneous picker calls
- Proper error handling with user-friendly error messages
- Uses `MediaTypeOptions.Images` for maximum compatibility
- Supports both camera and library image selection
- Works with Expo managed workflow and development builds
- Callback-based API for better error handling and user feedback

