# File: app/(tabs)/_layout.tsx

### Summary
Defines the bottom tab bar with Explore, Map, Create, Messages, and Profile. Now shows a numeric notifications badge on the Profile icon, capped at 9+ and aligned with the Messages unread indicator behavior.

### Fixes Applied log
- problem: Profile tab had no indicator for unread notifications.
- solution: Added `unreadNotificationsCount` derivation and a numeric badge rendered on the Profile icon with 9+ cap.

### How Fixes Were Implemented
- Computed `unreadNotificationsCount` (temporary derivation from `state.tokis` pending a dedicated notifications store). If a dedicated `state.unreadNotificationsCount` exists later, swap to that.
- Wrapped the `User` icon with a container and rendered a red badge when the count > 0. Badge text shows exact number up to 9, then `9+`.
- Added `countBadge` and `countBadgeText` styles and reused existing responsive sizing logic for consistency.
