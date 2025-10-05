# File: my-tokis.tsx

### Summary
My Tokis screen lists the user’s Tokis with three filters and a responsive grid layout. It now mirrors the Explore page UX: Hosting, Joined, Pending chips, pull-to-refresh, focus-based reload, and a wrapping card grid using `TokiCard`.

### Fixes Applied log
- problem: Counts and filters were based on an unused `status` field, so chips always showed 0 and were inconsistent with other screens.
- solution: Normalized items from `joinStatus` and host id to derive `normalizedStatus` (`hosting` | `joined` | `pending`) and `isHostedByUser`. All counts and filtering use this normalization.

- problem: Layout differed from Explore; cards rendered in a single column and didn’t wrap.
- solution: Adopted Explore’s responsive grid (`tokisContainer` with wrap and `cardWrapper` width constraints) so cards flow into columns on larger screens.

- problem: Missing pull-to-refresh and focus refresh behavior.
- solution: Added `RefreshControl` and `useFocusEffect` to reload data consistently when the screen regains focus and on user pull-down.

- problem: Empty-state copy was generic and didn’t reflect the selected filter.
- solution: Added per-filter messages for Hosting/Joined/Pending.

### How Fixes Were Implemented
- Added a memo `tokisWithStatus` that maps each toki to `{ ...t, isHostedByUser, normalizedStatus }` using:
  - `isHostedByUser`: `t.host?.id === currentUserId || t.joinStatus === 'hosting'`
  - `normalizedStatus`: `hosting` | `joined` (for `approved`/`joined`) | `pending` (for `pending`) | `other`
- Replaced chips with: Hosting, Joined, Pending, wiring counts to the normalized list and filtering via `normalizedStatus`.
- Switched list container to the Explore grid: `flexDirection: 'row'`, `flexWrap: 'wrap'`, `justifyContent: 'center'`, `gap: 16`, plus `cardWrapper` with `flexBasis` and `maxWidth`.
- Added `RefreshControl` and `useFocusEffect`-based reload for parity with Explore.
- Updated types minimally and kept `TokiCard` props consistent (`isHostedByUser` preserved).
