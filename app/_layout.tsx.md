# File: app/_layout.tsx

### Summary
Root layout that initializes app providers and navigation. Now also initializes centralized logging early.

### Fixes Applied log
- problem: Logging was too verbose and hard to follow.
- solution: Imported `utils/logger` at the top so all console logs in the app respect the global log level.
- problem: Deep-link navigation to `/join/:code` in an incognito window sometimes stuck on initial load because the auth guard redirected before routing segments were ready.
- solution: In `RootLayoutNav`, detect the raw `window.location.pathname` and treat paths starting with `/join` as being on the join screen during the first auth check. This prevents premature redirects and allows invite pages to load unauthenticated.

### How Fixes Were Implemented
- Added `import '@/utils/logger'` as the first import so console patching happens before other modules run. This ensures existing `console.*` calls across the app are filtered by level.
- Updated the auth-check effect to:
  - Read `window.location.pathname` once and set `pathIsJoin`.
  - If `pathIsJoin` is true, skip the initial auth check entirely to avoid redirecting away.
  - Otherwise, proceed with debounced auth checks and redirects as before.
  - Result: Pasting an invite link like `http://localhost:8081/join/ABC123` immediately renders the join page; it loads public invite info and asks the user to log in only when needed.


