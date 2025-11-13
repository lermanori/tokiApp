# File: AppInstallPrompt.tsx

### Summary
Component that attempts to automatically open the Toki iOS app when users visit universal link pages on iOS devices. If the app doesn't open automatically, it shows a custom modal prompt with an "Open in App" button. Only appears on iOS devices and respects session storage to avoid showing repeatedly.

### Fixes Applied log
- **problem**: Component caused infinite refresh loop on iOS browsers when attempting to auto-open app
- **solution**: Replaced `window.location.href = url` with hidden link click method, and added sessionStorage tracking to prevent multiple attempts
- **problem**: App doesn't open when user clicks "Open in App" button - iOS blocks programmatic universal link triggers
- **solution**: Removed auto-open attempt (iOS blocks programmatic triggers), show prompt immediately. Use `window.location.href` directly in user-initiated button click handler (iOS allows universal links when triggered by real user interaction)

### How Fixes Were Implemented
- Created new component with iOS detection using user agent
- **iOS Security Restriction**: iOS blocks programmatic universal link triggers for security reasons - they require real user interaction
- **Auto-open removed**: No longer attempts to auto-open app programmatically (iOS blocks this). Instead, shows prompt immediately on iOS detection
- **User-initiated action**: When user clicks "Open in App" button, uses `window.location.href` directly - iOS allows universal links when triggered by real user interaction
- Uses sessionStorage to track attempts (`toki-app-auto-open-attempted`) to prevent showing prompt multiple times
- Shows custom modal prompt immediately on iOS (no auto-open attempt)
- Includes session storage tracking to prevent showing prompt again in same session
- Styled to match Toki design system (purple buttons, Inter font, rounded corners)
- Handles both universal links and custom scheme fallback
- **Refresh loop fix**: Removed `hasAttemptedAutoOpen` state, now uses sessionStorage which persists across page refreshes to prevent infinite loops
- **Universal link fix**: Removed programmatic click attempts, use direct `window.location.href` in user-initiated button handler

