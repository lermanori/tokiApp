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