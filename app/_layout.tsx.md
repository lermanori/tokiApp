# File: app/_layout.tsx

### Summary
Root layout that initializes app providers and navigation. Now also initializes centralized logging early.

### Fixes Applied log
- problem: Logging was too verbose and hard to follow.
- solution: Imported `utils/logger` at the top so all console logs in the app respect the global log level.
- problem: Deep-link navigation to `/join/:code` in an incognito window sometimes stuck on initial load because the auth guard redirected before routing segments were ready.
- solution: In `RootLayoutNav`, detect the raw `window.location.pathname` and treat paths starting with `/join` as being on the join screen during the first auth check. This prevents premature redirects and allows invite pages to load unauthenticated.
- problem: `window.location.href` access in `getUrlParams()` functions crashed on React Native because `window.location` doesn't exist or doesn't have `href` property in native environments.
- solution: Added safety checks to verify `window.location` exists and has `href` before accessing it, and wrapped URL parsing in try-catch to handle React Native environments gracefully.
- problem: Status bar had a white background (`backgroundColor="#FFFFFF"`) that didn't match the gradient background used in the login screen, creating a visual mismatch.
- solution: Removed the `backgroundColor` prop and set `style="dark"` so the status bar is transparent (translucent defaults to true) and allows the gradient to show through naturally, while ensuring dark text/icons for visibility.
- problem: `/set-password` and `/reset-password` routes were being protected by auth guard, redirecting unauthenticated users to login page.
- solution: Added `inSetPasswordScreen` and `inResetPasswordScreen` checks to allow these public routes without authentication, and registered them in the Stack navigator.

### How Fixes Were Implemented
- Added `import '@/utils/logger'` as the first import so console patching happens before other modules run. This ensures existing `console.*` calls across the app are filtered by level.
- Updated the auth-check effect to:
  - Read `window.location.pathname` once and set `pathIsJoin`.
  - If `pathIsJoin` is true, skip the initial auth check entirely to avoid redirecting away.
  - Otherwise, proceed with debounced auth checks and redirects as before.
  - Result: Pasting an invite link like `http://localhost:8081/join/ABC123` immediately renders the join page; it loads public invite info and asks the user to log in only when needed.
- Fixed `getUrlParams()` functions (two instances) to:
  - Check if `window.location` exists and has `href` property before accessing it (web-only API).
  - Wrap `new URL()` parsing in try-catch block to gracefully handle React Native where URL parsing may fail.
  - Return empty object `{}` if any check fails, preventing crashes on native platforms.
- Fixed `window.location.pathname` access in `checkAuth()` function to use optional chaining (`window.location?.pathname`) for safe access on React Native.
- Updated `StatusBar` component configuration:
  - Changed `style="auto"` to `style="dark"` to explicitly set dark text/icons for light backgrounds.
  - Removed `backgroundColor` prop so the status bar is transparent (translucent defaults to `true`), allowing the gradient backgrounds (like the login screen's `#FFF1EB` to `#E5DCFF` gradient) to show through naturally.
  - This eliminates the white status bar background that was visually mismatched with the app's gradient backgrounds.
- Added password reset/set routes to public access:
  - Added `inSetPasswordScreen` and `inResetPasswordScreen` boolean checks that detect if the current route is `/set-password` or `/reset-password`.
  - Updated the auth guard condition to exclude these screens from redirecting to login.
  - Added `<Stack.Screen name="set-password" />` and `<Stack.Screen name="reset-password" />` to the Stack navigator.
  - Result: Users can now access password reset/set pages via email links without being redirected to login.
