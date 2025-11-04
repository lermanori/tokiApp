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

### How Fixes Were Implemented
1. Compute drawn size: `manipulateAsync` -> original `imgW/imgH`; scale to fit 300×200; set `imageDimensions = {drawnW, drawnH}` and center offsets.
2. Render: switch preview `Image` to `resizeMode="contain"`; position crop overlay with width/height of drawn image and left/top offsets.
3. Drag/resize: include offsets in min/max bounds; keep aspect during corner resizing; clamp within drawn region.
4. Crop math: subtract offsets before scaling to original pixels in both `updateProfilePreview` and final `handleCrop`.
5. Container/UI: container is now dynamic — width = min(screenWidth−40, 600), height = min(0.38×screenHeight, 420). Image stays contain-fit inside, so aspect ratio is preserved and no overflow occurs. Also added `previewCard` (rounded corners, subtle border/shadow, padding).
