# File: TokiCard.tsx

### Summary
This file contains a reusable TokiCard component that displays Toki event information in a consistent card format. It's used by both the Explore and Discover tabs to ensure identical appearance and behavior.

### Fixes Applied log
- **problem**: Category badge text colors were inconsistent - some backgrounds were too light for white text, making them hard to read.
- **solution**: Implemented dynamic text color calculation based on background brightness using YIQ formula.

### How Fixes Were Implemented
- **Added `getTextColorForBackground` function**: Converts hex colors to RGB, calculates brightness using YIQ formula, and returns appropriate text color (white for dark backgrounds, dark for light backgrounds).
- **Updated category badge rendering**: Now dynamically sets text color based on the calculated background brightness instead of hardcoded white.
- **Added 'social' category color**: Set to `#6B7280` (darker gray) for better contrast and readability.
- **Removed hardcoded color**: The `categoryBadgeText` style no longer has a fixed white color, allowing dynamic color assignment.

### Technical Details
- **YIQ Formula**: Used industry-standard brightness calculation: `(R*299 + G*587 + B*114) / 1000`
- **Threshold**: 128 - backgrounds brighter than this get dark text, darker backgrounds get white text
- **Dynamic Styling**: Text color is calculated at render time based on the specific category color
- **Consistent Experience**: Both Explore and Discover tabs now show identical, readable category badges
