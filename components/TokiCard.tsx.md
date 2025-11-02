# File: TokiCard.tsx

### Summary
This component displays Toki cards in lists with consistent formatting for distance, time, and other metadata.

### Fixes Applied log
- problem: Distance formatting function was duplicated locally instead of using shared utility.
- solution: Removed local `formatDistanceDisplay` function and imported from shared `@/utils/distance` utility.

### How Fixes Were Implemented
- problem: Distance formatting was inconsistent across components.
- solution: Updated to import and use `formatDistanceDisplay` from the shared utility, ensuring the same formatting logic is used throughout the app for consistent user experience.