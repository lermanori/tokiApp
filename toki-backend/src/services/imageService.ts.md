# File: imageService.ts

### Summary
This file contains the ImageService class that handles image uploads, validation, and transformations for the Toki backend. It provides methods for uploading profile images, Toki images, and reprocessing images from external URLs.

### Fixes Applied log
- **problem**: MCP-inserted images from external URLs were stored as-is without processing or transformation
- **solution**: Added `copyAndTransformImage` method that downloads images from URLs, validates them, and uploads to Cloudinary with consistent transformations

- **problem**: No support for image cropping with different aspect ratios
- **solution**: Added aspect ratio parameter support to `uploadTokiImage` and `copyAndTransformImage` methods, with helper function to convert aspect ratio strings to dimensions

- **problem**: Missing image format validation for downloaded images
- **solution**: Added `validateImageMagicBytes` helper function to validate JPEG, PNG, and WebP formats by checking file signatures

- **problem**: Inconsistent error logging (using console.error instead of logger)
- **solution**: Replaced all console.error calls with logger.error for consistent logging

### How Fixes Were Implemented

**Image Reprocessing for URLs:**
- Created `copyAndTransformImage` method that:
  - Downloads images from URLs with 15-second timeout
  - Handles up to 3 redirects automatically
  - Validates HTTP status, MIME type, and file size
  - Validates image format using magic bytes
  - Uploads to Cloudinary with same transformations as base64 uploads (800x600, crop: 'fill' by default)
  - Includes comprehensive logging at each step

**Aspect Ratio Support:**
- Added optional `aspectRatio` parameter to `uploadTokiImage` and `copyAndTransformImage`
- Created `getDimensionsFromAspectRatio` helper that:
  - Parses aspect ratio strings ("1:1", "4:3")
  - Returns appropriate width/height dimensions
  - Defaults to 4:3 (800x600) for tokis if not specified
  - Supports 1:1 (600x600) for square images

**Magic Bytes Validation:**
- Implemented `validateImageMagicBytes` function that checks:
  - JPEG: FF D8 FF signature
  - PNG: 89 50 4E 47 0D 0A 1A 0A signature
  - WebP: RIFF...WEBP signature
- Prevents invalid or corrupted image data from being uploaded

**Error Handling:**
- Network errors (timeout, DNS, connection refused) are caught and logged
- HTTP errors (404, 403, 500) are validated before processing
- Invalid MIME types and file sizes are rejected early
- All errors return structured `UploadResult` objects with error messages



