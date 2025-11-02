# File: TokiCard.tsx

### Summary
This component displays Toki cards in lists with consistent formatting for distance, time, and other metadata.

### Fixes Applied log
- problem: Distance formatting function was duplicated locally instead of using shared utility.
- solution: Removed local `formatDistanceDisplay` function and imported from shared `@/utils/distance` utility.
- problem: Location text could overflow horizontally in cards with long location names.
- solution: Added text truncation with ellipsis for location display in cards.

### How Fixes Were Implemented
- problem: Distance formatting was inconsistent across components.
- solution: Updated to import and use `formatDistanceDisplay` from the shared utility, ensuring the same formatting logic is used throughout the app for consistent user experience.
- problem: Long location strings (e.g., "Rothschild Boulevard ,רוטשילד תל אביב") could extend beyond the card width.
- solution: 
  - Added `numberOfLines={1}` and `ellipsizeMode="tail"` props to the location Text component
  - Created `locationContainer` style with `flex: 1` and `minWidth: 0` to enable proper flex truncation
  - This ensures location text truncates with "..." when it exceeds the available horizontal space, keeping the card layout clean