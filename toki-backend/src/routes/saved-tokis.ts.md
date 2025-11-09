# File: saved-tokis.ts

### Summary
This file contains the backend API routes for managing saved Tokis. It handles getting a user's saved Tokis, saving a Toki, unsaving a Toki, and checking if a Toki is saved.

### Fixes Applied log
- **problem**: Saved Tokis were showing default category images instead of actual Toki images.
- **solution**: Updated the `imageUrl` field mapping to check for `image_urls` array first (new multiple images feature) and use the first image if available, falling back to the legacy `image_url` field. This matches the logic used in the main Tokis route.
- **Added 12-hour time filter**: Added filter to exclude saved tokis that are more than 12 hours past their scheduled start time, consistent with the main tokis list endpoint.

### How Fixes Were Implemented
- **problem**: The saved-tokis route was only returning `row.image_url` (legacy single image field) without checking for the new `image_urls` array field.
- **solution**: Changed line 91 from `imageUrl: row.image_url,` to `imageUrl: row.image_urls && row.image_urls.length > 0 ? row.image_urls[0] : row.image_url,` to prioritize the new multiple images feature while maintaining backward compatibility with the legacy single image field.
- **12-hour time filter implementation**:
  - problem: Saved tokis that were more than 12 hours past their start time were still being displayed.
  - solution: Added SQL filter `(t.scheduled_time IS NULL OR t.scheduled_time >= NOW() - INTERVAL '12 hours')` to the WHERE clause in the GET `/` endpoint (line 58).
  - Logic: Shows saved tokis that are in the future or within 12 hours of their start time. Tokis without a scheduled_time (NULL) are still shown to support "now" tokis. This ensures consistency with the main tokis list endpoint behavior.

