# File: app/_layout.tsx

### Summary
Root layout that initializes app providers and navigation. Now also initializes centralized logging early.

### Fixes Applied log
- problem: Logging was too verbose and hard to follow.
- solution: Imported `utils/logger` at the top so all console logs in the app respect the global log level.

### How Fixes Were Implemented
- Added `import '@/utils/logger'` as the first import so console patching happens before other modules run. This ensures existing `console.*` calls across the app are filtered by level.


