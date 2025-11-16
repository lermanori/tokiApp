# File: components/TokiSortModal.tsx

### Summary
Reusable modal for choosing how events are ordered on Explore and Discover/Map. Exposes a simple controlled API via `value`, `onChange`, and `onApply`.

### Fixes Applied log
- problem: Users could filter events but had no control over ordering, making discovery less intuitive.
- solution: Added a shared sort modal with common presets (Relevance, Date, Distance, Popularity, Created, Title) and a consistent footer Apply button.
- problem: Selected sort option had minimal visual feedback (just a bullet point).
- solution: Enhanced highlighting with border, shadow, and checkmark icon for better visual feedback.

### How Fixes Were Implemented
- Implemented `TokiSortModal` as a controlled component with `SortKey` and `SortState` types to ensure clarity.
- Enhanced visual states: selected row now has purple border (#5B40F3), shadow effect, and a checkmark icon in a circular container instead of a simple bullet.
- Added `Check` icon from lucide-react-native for better visual indication of selected state.
- Modal mirrors the filters modal style (header, list, footer).


