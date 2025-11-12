# File: components/TokiCard.tsx

### Summary
This component displays a Toki (event) card with image, title, location, time, host information, and interaction buttons. It supports saving/unsaving tokis and navigation to details or host profile.

### Fixes Applied log

- **problem**: No way to track when images finish loading, causing loading state to clear before images are ready
- **solution**: Added image loading tracking with `onImageLoad` callback prop. Tracks both header image and host avatar loading states, and notifies parent component when all images are loaded.

### How Fixes Were Implemented

1. **Image Loading State**:
   - Added `imagesLoaded` state to track header image and host avatar loading
   - Header image and host avatar both have `onLoad` and `onError` handlers
   - If host has no avatar, it's considered "loaded" immediately (fallback view)

2. **Callback Prop**:
   - Added `onImageLoad?: () => void` prop to TokiCardProps interface
   - When both images are loaded, calls `onImageLoad()` to notify parent
   - Error handlers also mark images as "loaded" to prevent blocking

3. **State Reset**:
   - Image loading state resets when toki ID, image URL, or host avatar changes
   - Ensures accurate tracking when toki data updates
