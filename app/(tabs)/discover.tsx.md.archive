# File: app/(tabs)/discover.tsx

### Summary
The Discover screen displays a map and list of nearby Tokis with filtering, sorting, and search capabilities. Users can view tokis on a map or in a list, filter by category, distance, and other criteria.

### Fixes Applied log

- **problem**: Loading state cleared before images finished loading, causing flicker and poor UX
- **solution**: Implemented image loading tracking that waits for initial batch of images (first 20 items) to load before clearing loading state. Includes 3-second timeout fallback to prevent indefinite loading.

### How Fixes Were Implemented

1. **Image Loading Tracking**:
   - Added `imageLoadTracking` state (Set of toki IDs that have loaded images)
   - Tracks only the initial batch (first 20 items matching `initialNumToRender`)
   - Each TokiCard calls `onImageLoad` when its images finish loading

2. **Loading State Management**:
   - Loading state only clears when all initial batch images are loaded
   - Includes 100ms delay after images load to ensure rendering
   - 3-second timeout fallback prevents indefinite loading if images fail

3. **State Reset**:
   - Image tracking resets when new data loads (when `state.loading` becomes false)
   - Clears any existing timeout when resetting

4. **Integration**:
   - TokiCard components receive `onImageLoad` callback
   - Only tracks images in initial batch (index < initialBatchSize)
   - Prevents tracking images from pagination/append operations
