# File: TokiCard.tsx

### Summary
This file contains a reusable TokiCard component that displays Toki event information in a consistent card format. It's used by both the Explore and Discover tabs to ensure identical appearance and behavior.

### Fixes Applied log
- **problem**: Category badge text colors were inconsistent - some backgrounds were too light for white text, making them hard to read.
- **solution**: Implemented dynamic text color calculation based on background brightness using YIQ formula.
- **problem**: Lock icon was appearing above "Private" text instead of to the left due to vertical flex layout.
- **solution**: Added `flexDirection: 'row'` and `alignItems: 'center'` to categoryBadge style for horizontal alignment.
- **problem**: Private badge was not aligned with the heart icon in the header.
- **solution**: Moved Private badge inside the headerActions container to align it with the heart icon on the right side.

### How Fixes Were Implemented
- **Added `getTextColorForBackground` function**: Converts hex colors to RGB, calculates brightness using YIQ formula, and returns appropriate text color (white for dark backgrounds, dark for light backgrounds).
- **Updated category badge rendering**: Now dynamically sets text color based on the calculated background brightness instead of hardcoded white.
- **Added 'social' category color**: Set to `#6B7280` (darker gray) for better contrast and readability.
- **Removed hardcoded color**: The `categoryBadgeText` style no longer has a fixed white color, allowing dynamic color assignment.
- **Fixed Private badge layout**: Updated `categoryBadge` style to include `flexDirection: 'row'`, `alignItems: 'center'`, and `gap: 4` to properly align the Lock icon to the left of the "Private" text horizontally instead of stacking vertically.
- **Aligned Private badge with heart icon**: Moved the Private badge from being a separate element in `eventHeader` to inside the `headerActions` container, so it now appears next to the heart icon on the right side of the card header.

### Technical Details
- **YIQ Formula**: Used industry-standard brightness calculation: `(R*299 + G*587 + B*114) / 1000`
- **Threshold**: 128 - backgrounds brighter than this get dark text, darker backgrounds get white text
- **Dynamic Styling**: Text color is calculated at render time based on the specific category color
- **Consistent Experience**: Both Explore and Discover tabs now show identical, readable category badges
