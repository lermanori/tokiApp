# File: toki-details.tsx

### Summary
This file implements the Toki details screen, displaying comprehensive information about a specific Toki event including participants, host details, and event metadata.

### Fixes Applied log
- **Problem**: Timezone conversion issue causing 2-hour difference between input time and display time
- **Solution**: Added `timeZone: 'UTC'` to `toLocaleTimeString` options to display time in UTC, matching the input time format

### How Fixes Were Implemented
- **Problem**: The `formatTimeDisplay` function was converting UTC time to local timezone for display
- **Solution**: Modified `toLocaleTimeString` call to include `timeZone: 'UTC'` parameter, ensuring the displayed time matches the input time (16:15 → 4:15 PM instead of 6:15 PM)
- **Backend Integration**: Updated backend to return `scheduledTime` in UTC format (`YYYY-MM-DD HH:MM`)
- **Date Parsing**: Enhanced date parsing to treat backend timestamps as UTC by adding 'Z' suffix