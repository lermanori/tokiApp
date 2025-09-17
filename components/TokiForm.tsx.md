# File: TokiForm.tsx

### Summary
This file contains the TokiForm component for creating and editing Tokis. It includes form fields for title, description, location, activity types, time, attendees, tags, and images.

### Fixes Applied log
- **problem**: Activity type selection was single-select only, limiting users to one activity type per Toki.
- **solution**: Updated to support multiple activity type selection (up to 3 options) with visual feedback and validation.
- **problem**: Date entry required manual typing or preset selection only.
- **solution**: Integrated `react-native-ui-datepicker` with a modal picker for selecting dates.

### How Fixes Were Implemented
- **State Management**: Changed `selectedActivity` (string) to `selectedActivities` (string array) to support multiple selections.
- **Selection Logic**: Added `handleActivitySelect()` function that:
  - Toggles activity selection (add/remove from array)
  - Enforces 3-activity maximum with user alert
  - Prevents selection when limit reached
- **UI Updates**: 
  - Added activity counter hint showing "Select up to 3 activity types (X/3 selected)"
  - Added disabled state styling for unselectable activities when limit reached
  - Updated button styling to show selected state for multiple activities
- **Data Handling**: Updated form submission to send:
  - `activity`: Primary activity (first selected)
  - `activities`: Array of all selected activities
  - `tags`: Includes all selected activities plus custom tags
  - `category`: Uses primary activity for backward compatibility
- **Validation**: Updated to require at least one activity type instead of exactly one.
- **Backward Compatibility**: Maintains support for single activity in `initialData.activity` while adding support for `initialData.activities` array.

### Date Picker Integration
- Uses `react-native-ui-datepicker` and `dayjs`.
- Opens a modal when tapping the calendar icon in the Date field.
- On selection, updates `customDateTime`'s date portion in `YYYY-MM-DD` while preserving the current time (defaults to `14:00` if empty).
- Picker state: `isDatePickerVisible`.

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