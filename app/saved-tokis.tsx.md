# File: app/saved-tokis.tsx

### Summary
Screen displaying user's saved tokis with search functionality. Now uses global state instead of local state for saved tokis list.

### Fixes Applied log
- problem: Saved tokis screen maintained local state for savedTokis array, causing inconsistencies when tokis were saved/unsaved from other screens.
- solution: Removed local state and updated to use global state.savedTokis directly. Actions automatically update global state.

### How Fixes Were Implemented
- Removed `const [savedTokis, setSavedTokis] = useState<SavedToki[]>([]);`
- Updated to use `state.savedTokis` instead of local `savedTokis` variable.
- Updated `loadSavedTokis()` to just call `actions.getSavedTokis()` which updates global state.
- Removed all `setSavedTokis()` calls.
- Updated `handleUnsaveToki()` - state is automatically updated by the action.
- Updated empty state check to use `state.savedTokis.length`.

