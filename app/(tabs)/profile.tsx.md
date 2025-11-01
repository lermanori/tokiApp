### Summary
Profile tab screen: renders user header, stats, quick actions, and settings. Now includes a "My Activity" horizontal list with per-item hide/show and a "Show as member" preview toggle.

### Fixes Applied log
- problem: Users could not manage visibility of activities on their profile.
- solution: Added My Activity cards with Eye/EyeOff toggle, and a profile preview mode.

- problem: Edit Profile action used a credit card icon, causing confusion.
- solution: Switched to the proper `Edit3` icon from `lucide-react-native`.

### How Fixes Were Implemented
- Imported `TokiCard`, `Eye`, `EyeOff` and added `myActivity` state.
- Loaded activity on focus via `apiService.getMyActivity()`.
- Implemented `toggleActivityVisibility` calling `hideActivity`/`showActivity` then refreshing list.
- Inserted a section between stats and the existing sections list to render cards and a "Show as member" button that navigates to the user's public profile (`/user-profile/{id}`).

### How Fixes Were Implemented (icon)
- Replaced `CreditCard as Edit3` import with `Edit3` from `lucide-react-native` in `profile.tsx` header.
- The middle header button continues to render `<Edit3 />`, now displaying a pencil/edit glyph.


