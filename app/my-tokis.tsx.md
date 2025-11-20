# File: my-tokis.tsx

### Summary
My Tokis screen displays user's tokis with filtering (Hosting, Joined, Pending). Now includes recreate functionality to duplicate hosting tokis.

### Fixes Applied log
- problem: No way to quickly recreate/duplicate a toki the user is hosting.
- solution: Added `transformTokiToInitialData` helper function to map toki data to TokiForm initialData format. Added `handleRecreateToki` function that transforms data and navigates to create page with pre-filled data. Wired recreate props to TokiCard components, showing recreate button only for hosting tokis.

### How Fixes Were Implemented
- Created `transformTokiToInitialData` helper function that maps toki fields to initialData:
  - Maps `title`, `description`, `location`, `latitude`, `longitude` directly.
  - Maps `category` to both `activity` (string) and `activities` (array).
  - Maps `time` and `scheduledTime` to `time` and `customDateTime`.
  - Maps `maxAttendees`, `tags`, `visibility`.
  - Maps `images` array or single `image` to `images` format with proper structure.
- Created `handleRecreateToki` function that:
  - Transforms toki data using the helper function.
  - Navigates to create page with `initialData` as JSON string in route params.
- Updated TokiCard usage to pass:
  - `onRecreate={() => handleRecreateToki(toki)}` callback.
  - `showRecreateButton={toki.isHostedByUser || toki.normalizedStatus === 'hosting'}` to only show for hosting tokis.
