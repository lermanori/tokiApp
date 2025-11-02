# File: components/TokiForm.tsx

### Summary
Create/edit Toki form. Activity selection now derives from the canonical `CATEGORIES` list.

### Fixes Applied log
- problem: Activity types were hard-coded (8 only), missing DB categories.
- solution: Build `activityTypes` from `CATEGORIES` so the form always matches backend/DB.

### How Fixes Were Implemented
- Imported `CATEGORIES` from `utils/categories`.
- Mapped the array into `{ id, label }` for the selector; icons will be wired once assets are added.

### Date Picker Integration
- Uses `react-native-ui-datepicker` and `dayjs`.
- Opens a modal when tapping the calendar icon in the Date field.
- On selection, updates `customDateTime`'s date portion in `YYYY-MM-DD` while preserving the current time (defaults to `14:00` if empty).
- Picker state: `isDatePickerVisible`.

### Time Picker Minute Interval Update
- problem: Time selection allowed every minute, leading to inconsistent times and extra scrolling.
- solution: Restrict selection to 15-minute intervals across platforms.

### How Fix Was Implemented
- Web `react-mobile-picker`: minutes column now uses `['00','15','30','45']` and snaps current minute to nearest quarter.
- iOS `@react-native-community/datetimepicker`: added `minuteInterval={15}`.
- Android: rounds chosen time to nearest 15 minutes before saving.

### Installation
```bash
npm i react-native-ui-datepicker dayjs
```

### UI/UX
- Modal has a dim backdrop, card container, and a "Done" button to close.
- Works on web and native. If native-specific pickers are later desired, this modal wrapper can be kept with platform checks.

### Technical Details
- **Maximum Selection**: 3 activities (configurable via constant)
- **Visual Feedback**: Selected activities show purple background, disabled activities show gray with reduced opacity
- **User Experience**: Clear counter and helpful error message when limit exceeded
- **Data Structure**: Maintains backward compatibility with existing single-activity Tokis

### Privacy Toggle Update
- Added a Privacy toggle (Public / Private invite-only).
- The toggle controls `visibility` sent on create/update (`'public'` or `'private'`).
- In edit mode, the toggle initializes from `initialData.visibility` and stays in sync if the parent reloads data.

### Location Dropdown Mobile Fix
- problem: On mobile devices, only the secondary text (city/country) was showing in the location autocomplete dropdown, while the main text (location name) was not visible. This worked correctly on web.
- solution: Fixed React Native Text component rendering issues by removing `flex: 1` and redundant `marginLeft` from `autocompleteText` style, and added `lineHeight` for consistent rendering.

### How Fix Was Implemented
- Removed `flex: 1` from `autocompleteText` style - Text components shouldn't have flex properties on React Native as it can cause rendering issues
- Removed redundant `marginLeft: 8` from `autocompleteText` style (parent View already has it)
- Added `lineHeight: 20` to ensure consistent text rendering on mobile
- Added conditional rendering to only show main text when it exists
- Added `marginTop: 2` to secondary text for better spacing between main and secondary text

### Location Dropdown Overflow Fix and Result Limit
- problem: Long location names were overflowing the container, and too many results (8) were being fetched from the API.
- solution: Fixed text overflow with proper flex constraints and reduced API results from 8 to 5.

### How Overflow Fix Was Implemented
- Added `minWidth: 0` to the text container View to allow proper flex shrinking
- Added `overflow: 'hidden'` to `autocompleteItem` style to prevent text overflow
- Added `flexShrink: 1` to both `autocompleteText` and `autocompleteSecondaryText` styles to allow text to shrink properly
- Added `ellipsizeMode="tail"` to both Text components for proper truncation with ellipsis
- Created dedicated `autocompleteSecondaryText` style for consistency and maintainability
- Reduced backend API results from 8 to 5 in `toki-backend/src/routes/maps.ts` to show fewer, more relevant results