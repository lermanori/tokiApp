# File: create.tsx

### Summary
Create Toki screen that allows users to create new tokis. Now supports pre-filling form data from route parameters for the recreate feature.

### Fixes Applied log
- problem: Create page did not support pre-filling form data from route parameters, preventing the recreate feature from working.
- solution: Added `useLocalSearchParams` to read `initialData` from route params, parse it as JSON, and pass it to `TokiForm` component. Added error handling for JSON parsing failures.

### How Fixes Were Implemented
- Imported `useLocalSearchParams` from `expo-router` and `useMemo` from React.
- Added `params` constant using `useLocalSearchParams()`.
- Created `initialData` memo that parses `params.initialData` as JSON string, with try-catch for error handling.
- Passed `initialData` prop to `TokiForm` component.
- When `initialData` is provided via route params, the form will be pre-filled with that data, enabling the recreate feature.
