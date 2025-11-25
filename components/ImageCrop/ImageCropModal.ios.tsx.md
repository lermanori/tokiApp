# File: ImageCropModal.ios.tsx

### Summary
This is the iOS-specific implementation of the image cropping modal. It provides an interactive crop box that users can drag to select the area they want to crop. The component supports both profile (1:1) and toki (4:3) aspect ratios and shows a real-time preview of the cropped result.

### Fixes Applied Log
 - Problem: Portrait images appeared squashed/stretched in the preview and the crop didn’t match the shown area.
 - Solution: Measure the drawn image size with contain-fit inside a 300×200 container, center the overlay over that drawn region, and convert crop coordinates relative to that region. Updated bounds/resize math to include the centered offsets.

 - Problem: Crop overlay bounds used container coordinates, letting the crop drift outside the drawn image.
 - Solution: Constrain drag/resize to the drawn image box by adding left/top offsets and recalculating max bounds.

- Problem: Preview box was still slightly off and container felt cramped.
- Solution: Increased preview container to 340×240 and made all crop coordinates relative to the drawn image (no offset subtraction during crop conversion). This removes residual distortion and improves usability.

- Problem: Image gets pixelated when user touches the crop area, even slightly.
- Solution: Replaced `ImageManipulator.manipulateAsync` calls used for getting image dimensions with `Image.getSize()` to avoid unnecessary image re-processing. Added guard in `onLayout` callback to prevent repeated measurements. This prevents the image from being re-processed during user interaction, which was causing pixelation.

- Problem: Aspect ratio breaks when resizing crop box to larger size near image boundaries.
- Solution: Updated `handleResizeMove` clamping logic to maintain aspect ratio when hitting image bounds. Now calculates maximum available size from position constraints and clamps width/height proportionally, ensuring aspect ratio is preserved even when resizing near edges.

- Problem: Actual cropped output image doesn't match the preview - incorrect crop coordinates due to variable name shadowing.
- Solution: Fixed variable name conflict in `handleCrop` where local `imageDimensions` was shadowing the state variable. Renamed local variable to `actualImageDimensions` and ensured scale calculation uses the correct drawn dimensions from state (`imageDimensions`) vs actual image dimensions.

### How Fixes Were Implemented
1. Compute drawn size: `manipulateAsync` -> original `imgW/imgH`; scale to fit 300×200; set `imageDimensions = {drawnW, drawnH}` and center offsets.
2. Render: switch preview `Image` to `resizeMode="contain"`; position crop overlay with width/height of drawn image and left/top offsets.
3. Drag/resize: include offsets in min/max bounds; keep aspect during corner resizing; clamp within drawn region.
4. Crop math: subtract offsets before scaling to original pixels in both `updateProfilePreview` and final `handleCrop`.
5. Container/UI: container is now dynamic — width = min(screenWidth−40, 600), height = min(0.38×screenHeight, 420). Image stays contain-fit inside, so aspect ratio is preserved and no overflow occurs. Also added `previewCard` (rounded corners, subtle border/shadow, padding).
6. Pixelation fix: Changed `updateProfilePreview()` to use `Image.getSize()` instead of `ImageManipulator.manipulateAsync()` for getting dimensions. Updated `onLayout` callback to use `Image.getSize()` and added early return guard to prevent repeated measurements. Updated `handleCrop()` to also use `Image.getSize()` for consistency. This prevents image re-processing during user interaction, eliminating pixelation when touching the crop area.
7. Aspect ratio fix: Refactored `handleResizeMove` clamping logic. Now clamps position first, then calculates maximum available size from both X and Y constraints while maintaining aspect ratio. Uses the smaller constraint to determine max size, then clamps width/height proportionally. This ensures aspect ratio is preserved when resizing near image boundaries.
8. Crop coordinate fix: Fixed critical bug in `handleCrop` where a local variable `imageDimensions` was shadowing the state variable of the same name. This caused incorrect scale calculations (dividing by actual image dimensions instead of drawn dimensions), resulting in wrong crop coordinates. Renamed local variable to `actualImageDimensions` and added logging to distinguish between actual and drawn dimensions. Scale calculation now correctly uses state `imageDimensions` (drawn size) as denominator.
