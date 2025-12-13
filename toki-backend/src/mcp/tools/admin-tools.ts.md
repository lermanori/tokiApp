# File: admin-tools.ts

### Summary
This file contains MCP (Model Context Protocol) tools for admin operations, including creating, updating, and deleting Tokis. It handles image processing for both base64 uploads and external URLs.

### Fixes Applied log
- **problem**: MCP-inserted images from external URLs were stored as-is without reprocessing or transformation
- **solution**: Updated `create_toki` and `update_toki` handlers to use `ImageService.copyAndTransformImage` for URL-based images instead of storing them directly

- **problem**: No support for image cropping with different aspect ratios in MCP tools
- **solution**: Added `aspectRatio` parameter to image schema and handlers, allowing MCP to specify "1:1" or "4:3" aspect ratios for cropping

- **problem**: Image processing logic didn't handle partial failures gracefully
- **solution**: Implemented partial success approach - failed images are logged but don't block successful ones

### How Fixes Were Implemented

**Image Reprocessing for URLs:**
- Modified image processing logic in both `create_toki` and `update_toki` handlers:
  - Removed requirement for `publicId` when `url` is provided
  - Changed from storing URLs directly to calling `ImageService.copyAndTransformImage`
  - Images are now downloaded, validated, and uploaded to Cloudinary with transformations
  - New Cloudinary URL and publicId are stored instead of original URL

**Aspect Ratio Support:**
- Updated MCP tool schema to include `aspectRatio` field in image objects:
  - Type: string enum with values "1:1" or "4:3"
  - Optional parameter (defaults to "4:3" if not specified)
  - Applies to both URL and base64 images
- Updated TypeScript types to include `aspectRatio?: '1:1' | '4:3'` in image arrays
- Pass aspect ratio to both `copyAndTransformImage` (for URLs) and `uploadTokiImage` (for base64)

**Error Handling:**
- Implemented partial success strategy:
  - Each image is processed independently
  - Failed images are logged with warning messages
  - Processing continues with remaining images
  - Only successfully processed images are added to the final arrays
- Added success logging when images are reprocessed successfully
- Error messages include the original URL and specific error details

**Backward Compatibility:**
- Base64 uploads continue to work as before
- Existing code paths remain unchanged
- Aspect ratio parameter is optional, maintaining default behavior





