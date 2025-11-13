# File: join/[code].tsx

### Summary
This file implements the join-by-invite-code screen, allowing users to join Toki events via invite links. It handles authentication checks, loading invite link information, checking participant status, and joining events.

### Fixes Applied log
- **Problem**: Limited logging made it difficult to debug issues in the join flow, especially around authentication, redirects, and API calls.
- **Solution**: Added comprehensive logging throughout the join flow with consistent `🔗 [JOIN FLOW]` prefix to track component lifecycle, authentication state, API calls, redirects, and user actions.
- **Problem**: Component was checking `state.currentUser?.id` before user state was loaded from storage/API, causing false "not logged in" redirects even when tokens existed.
- **Solution**: Updated authentication check to also verify tokens using `apiService.hasToken()`, and added a wait mechanism when tokens exist but user state hasn't loaded yet.
- **Problem**: Host avatar on join page was showing a simple icon or just initials without proper image support or fallback styling.
- **Solution**: Added Image component to display host profile picture when available, with proper initials fallback styled consistently with other components in the app.

### How Fixes Were Implemented
- **Problem**: Join flow had minimal logging, making debugging difficult
- **Solution**:
  - Added component mount/unmount logging to track when the component is rendered
  - Added detailed logging in `loadLinkInfo()` function:
    - Logs code and user ID at start
    - Logs authentication checks and redirect decisions
    - Logs API call to `getInviteLinkInfo` and response details
    - Logs invite link validation (active/inactive)
    - Logs toki normalization and details
    - Logs participant status checks (host check, already participant check)
    - Logs all redirect decisions with target URLs
    - Logs error handling with error details
  - Added detailed logging in `handleJoin()` function:
    - Logs when join button is clicked
    - Logs code and user ID
    - Logs API call to `joinByInviteCode` and result
    - Logs redirect decisions after successful join
    - Logs error handling
  - Added logging for render states (loading, error, no linkInfo, join UI)
  - All logs use consistent `🔗 [JOIN FLOW]` prefix with emoji indicators (✅ success, ⚠️ warning, ❌ error, 🎯 important action)
  - This comprehensive logging helps track the entire join flow from component mount through API calls to final redirect
- **Problem**: Component was redirecting to login even when user had valid tokens, because `state.currentUser?.id` wasn't set yet when component first mounted
- **Solution**:
  - Imported `apiService` to check for tokens
  - Updated `loadLinkInfo()` to check both `state.currentUser?.id` AND `apiService.hasToken()`
  - If tokens exist but user data isn't loaded yet, wait 300ms for state to sync before proceeding
  - Split logic into `loadLinkInfo()` (auth check) and `proceedWithLoadLinkInfo()` (actual API calls)
  - This ensures the component doesn't redirect to login prematurely when tokens exist but user state is still loading
- **Problem**: Host avatar on join page was showing a simple icon or just initials without proper image support or fallback styling
- **Solution**:
  - Imported `Image` from react-native and `getInitials` from `@/utils/tokiUtils`
  - Updated host avatar section to conditionally render `Image` when `host.avatar` exists
  - Added fallback view with initials when no avatar is available
  - Styled fallback avatar to match the pattern used in toki-details and other components:
    - Background color: `#F3F4F6`
    - Border: `1px solid #D1D5DB`
    - Initials text: `Inter-SemiBold`, `#6B7280`, `12px`
  - This provides a consistent user experience across the app for profile picture display

