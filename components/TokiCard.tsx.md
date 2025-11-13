# File: components/TokiCard.tsx

### Summary
This component displays a Toki (event) card with image, title, location, time, host information, and interaction buttons. It supports saving/unsaving tokis and navigation to details or host profile.

### Fixes Applied log

- **problem**: No way to track when images finish loading, causing loading state to clear before images are ready
- **solution**: Added image loading tracking with `onImageLoad` callback prop. Tracks both header image and host avatar loading states, and notifies parent component when all images are loaded.

- **problem**: Maximum update depth exceeded error caused by infinite loop in image loading handlers. Image `onLoad` and `onError` handlers were recreated on every render, causing React Native's Image component to re-trigger load events infinitely.
- **solution**: Memoized image sources using `useMemo` and memoized `onLoad`/`onError` handlers using `useCallback` with guards to prevent unnecessary state updates. This ensures stable function references and prevents infinite re-renders.

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

4. **Infinite Loop Prevention**:
   - Memoized `headerImageSource` and `hostAvatarSource` using `useMemo` to prevent source object recreation on every render
   - Memoized all image load/error handlers using `useCallback` to maintain stable function references
   - Added guards in handlers to skip state updates if image is already loaded, preventing unnecessary re-renders
   - This fixes the "Maximum update depth exceeded" error that occurred when images loaded
