# File: TokiCard.tsx

### Summary
TokiCard component displays toki information in a card format. Now includes a recreate button in the top-left corner of the header image for duplicating tokis.

### Fixes Applied log
- problem: No way to recreate/duplicate a toki from the card view.
- solution: Added optional `onRecreate` callback and `showRecreateButton` flag props. Added recreate button positioned absolutely in top-left of header image container. Button uses `CopyPlus` icon and only renders when both props are provided.

### How Fixes Were Implemented
- Added `CopyPlus` icon to imports from `lucide-react-native`.
- Extended `TokiCardProps` interface with optional `onRecreate?: () => void` and `showRecreateButton?: boolean` props.
- Added `handleRecreate` function that stops event propagation and calls `onRecreate` callback.
- Added recreate button JSX in `headerImageContainer` with conditional rendering based on `showRecreateButton && onRecreate`.
- Styled button with `recreateButton` style: absolute positioning (top: 12, left: 12), semi-transparent dark background, rounded corners, and z-index for proper layering.
- Button prevents card press event when clicked using `e.stopPropagation()`.
