# File: ImageCropModal.ios.tsx

### Summary
This is the iOS-specific implementation of the image cropping modal. It provides an interactive crop box that users can drag to select the area they want to crop. The component supports both profile (1:1) and toki (4:3) aspect ratios and shows a real-time preview of the cropped result.

### Fixes Applied Log
- **Problem**: Crop box was not positioned correctly over the image - it appeared offset or not aligned with the actual image.
- **Solution**: Fixed the image dimensions to use the actual preview size (300x200) instead of relying on `onLayout` which was returning inconsistent values. Simplified the crop overlay structure to position it directly over the image.

- **Problem**: Preview was showing the wrong content - not reflecting what was actually selected in the crop box.
- **Solution**: Updated `updateProfilePreview` to use the original `imageUri` instead of the scaled-down `previewUri`, calculate proper scale factors between the preview (300x200) and the actual image, and convert crop coordinates accordingly. This ensures the preview shows exactly what will be cropped from the full-resolution image.

- **Problem**: Preview was always square (50x50) regardless of aspect ratio, and labeled as "Profile Preview" even for toki images.
- **Solution**: Made the preview size dynamic based on `aspectRatio` (80x80 for 1:1, 120x90 for 4:3). Updated the label to show "Profile Preview" for profile mode and "Toki Image Preview" for toki mode. Added `tokiPreviewImage` style for rectangular preview containers.

- **Problem**: User requested both circle and rectangle previews to be shown simultaneously, and wanted resize functionality back.
- **Solution**: Created a dual preview layout showing both circle (80x80) and rectangle (120x90) previews side by side. Added back the resize functionality with corner handles that maintain aspect ratio and respect image boundaries. Implemented debounced preview updates (150ms) for better performance during drag/resize operations.

### How Fixes Were Implemented
1. **Crop Box Positioning**:
   - Moved `onLayout` handler from the `Image` to the `imageWrapper` View
   - Set `imageDimensions` to fixed values `{ width: 300, height: 200 }` matching the `iosPreviewImage` style
   - Simplified the crop overlay to use fixed dimensions and removed debug elements

2. **Preview Content Accuracy**:
   - Changed `updateProfilePreview` to use `imageUri` (original image) instead of `previewUri` (scaled preview)
   - Added logic to get actual image dimensions using `ImageManipulator.manipulateAsync`
   - Calculate scale factors: `scaleX = actualImageWidth / imageDimensions.width` and `scaleY = actualImageHeight / imageDimensions.height`
   - Convert crop coordinates: `actualCropX = cropPosition.x * scaleX`, etc.
   - Pass scaled coordinates to `ImageManipulator` for accurate cropping

3. **Aspect Ratio Support**:
   - Added conditional preview sizing: `previewWidth = aspectRatio === '1:1' ? 80 : 120` and `previewHeight = aspectRatio === '1:1' ? 80 : 90`
   - Updated preview container to use `profilePreviewImage` style for 1:1 and `tokiPreviewImage` style for 4:3
   - Changed label to be dynamic based on `mode` prop
   - Added `tokiPreviewImage` style to `styles.ts` with 120x90 dimensions and 8px border radius
