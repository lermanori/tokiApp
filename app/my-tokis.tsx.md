# File: my-tokis.tsx

### Summary
My Tokis screen lists the user's Tokis with three filters and a responsive grid layout. It now mirrors the Explore page UX: Hosting, Joined, Pending chips, pull-to-refresh, focus-based reload, and a wrapping card grid using `TokiCard`.

### Fixes Applied log
- problem: Counts and filters were based on an unused `status` field, so chips always showed 0 and were inconsistent with other screens.
- solution: Normalized items from `joinStatus` and host id to derive `normalizedStatus` (`hosting` | `joined` | `pending`) and `isHostedByUser`. All counts and filtering use this normalization.

- problem: Layout differed from Explore; cards rendered in a single column and didn't wrap.
- solution: Adopted Explore's responsive grid (`tokisContainer` with wrap and `cardWrapper` width constraints) so cards flow into columns on larger screens.

- problem: Missing pull-to-refresh and focus refresh behavior.
- solution: Added `RefreshControl` and `useFocusEffect` to reload data consistently when the screen regains focus and on user pull-down.

- problem: Empty-state copy was generic and didn't reflect the selected filter.
- solution: Added per-filter messages for Hosting/Joined/Pending.

- problem: Joined tokis filter showed 0 even when user had joined tokis. The main `/api/tokis` endpoint uses pagination and filters that could exclude some joined tokis, and the useEffect only synced tokis when state.tokis.length > 0.
- solution: Created a dedicated `/api/tokis/my-tokis` endpoint that returns ALL tokis the user is involved with (hosting, joined, or pending) without pagination limits. Updated MyTokisScreen to use `loadMyTokis()` instead of `loadTokis()`. Removed the length check so tokis always sync from state.tokis. Improved normalization logic to extract joinStatus and hostId into variables for clearer comparison.

### How Fixes Were Implemented
- Added a memo `tokisWithStatus` that maps each toki to `{ ...t, isHostedByUser, normalizedStatus }` using:
  - `isHostedByUser`: `t.host?.id === currentUserId || t.joinStatus === 'hosting'`
  - `normalizedStatus`: `hosting` | `joined` (for `approved`/`joined`) | `pending` (for `pending`) | `other`
- Replaced chips with: Hosting, Joined, Pending, wiring counts to the normalized list and filtering via `normalizedStatus`.
- Switched list container to the Explore grid: `flexDirection: 'row'`, `flexWrap: 'wrap'`, `justifyContent: 'center'`, `gap: 16`, plus `cardWrapper` with `flexBasis` and `maxWidth`.
- Added `RefreshControl` and `useFocusEffect`-based reload for parity with Explore.
- Updated types minimally and kept `TokiCard` props consistent (`isHostedByUser` preserved).
- Changed useEffect to always sync: `setTokis(state.tokis)` without length check.
- Refactored normalization to extract `joinStatus` and `hostId` into variables before comparison for better readability and debugging.

- problem: When navigating from the profile screen's "Tokis Joined" stat counter, the My Tokis page always opened on the "Hosting" tab instead of the "Joined" tab.
- solution: Added support for route parameters using `useLocalSearchParams()` to read the `tab` parameter. The initial `selectedFilter` state is now set based on the route parameter (defaulting to 'hosting' if not provided). Added a `useEffect` hook to update the selected filter when route params change, allowing deep linking to specific tabs.
