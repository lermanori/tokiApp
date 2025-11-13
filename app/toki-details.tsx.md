# File: toki-details.tsx

### Summary
This file implements the Toki details screen, displaying comprehensive information about a specific Toki event including participants, host details, and event metadata.

### Fixes Applied log
- **Problem**: Timezone conversion issue causing 2-hour difference between input time and display time
- **Solution**: Added `timeZone: 'UTC'` to `toLocaleTimeString` options to display time in UTC, matching the input time format
- **Problem**: Distance was hardcoded as "0.5 km" instead of using the actual calculated distance, causing inconsistency with card display
- **Solution**: Updated to get distance from `state.tokis` first (matching card display), with fallback to API response, and use shared `formatDistanceDisplay` utility
- **Problem**: After creating a toki, pressing back in details would return to create screen instead of home screen
- **Solution**: Added support for `fromCreate` parameter to redirect to home screen when coming from create flow (same as `fromEdit` behavior)
- **Problem**: Distance (km) was not updated when navigating to toki details, only when going back to homepage. After creating a toki, it showed "0.0 km" instead of the actual distance.
- **Solution**: Backend now calculates distance when fetching a single toki, and frontend prioritizes API distance over state
- **Problem**: Share functionality showed custom modal on all platforms, but iOS users expect native share sheet
- **Solution**: Added platform detection to use iOS native share sheet on iOS devices, while keeping custom modal for web/Android platforms
- **Problem**: Share links to Toki details pages were redirecting to the home page instead of the specific Toki details page, especially for authenticated users. The `tokiId` parameter was being lost during redirects.
- **Solution**: Added fallback URL parameter reading to ensure `tokiId` and other parameters are captured even if `useLocalSearchParams()` doesn't work correctly. All references to `params.tokiId` were replaced with `effectiveParams.tokiId` which uses direct URL parsing as a fallback.

### How Fixes Were Implemented
- **Problem**: The `formatTimeDisplay` function was converting UTC time to local timezone for display
- **Solution**: Modified `toLocaleTimeString` call to include `timeZone: 'UTC'` parameter, ensuring the displayed time matches the input time (16:15 → 4:15 PM instead of 6:15 PM)
- **Backend Integration**: Updated backend to return `scheduledTime` in UTC format (`YYYY-MM-DD HH:MM`)
- **Date Parsing**: Enhanced date parsing to treat backend timestamps as UTC by adding 'Z' suffix
- **Problem**: Distance display inconsistency between card and details page
- **Solution**: 
  - Updated `distance` field in `transformedToki` to prioritize distance from `state.tokis` (which matches what the card shows)
  - Changed hardcoded "0.5 km away" to use `formatDistanceDisplay(toki.distance)` for consistent formatting
  - Updated `TokiDetails` interface to allow distance as string or object `{km, miles}`
  - Imported shared `formatDistanceDisplay` utility from `@/utils/distance`
- **Problem**: Back navigation after creating a toki would return user to create screen instead of home
- **Solution**:
  - Added `fromCreate` variable to read `params.fromCreate === 'true'` (similar to existing `fromEdit`)
  - Updated back button handlers in both error state and main header to check `if (fromEdit || fromCreate)` and redirect to `/(tabs)` instead of calling `router.back()`
  - This ensures consistent navigation behavior: after creating or editing a toki, pressing back takes user to home screen rather than back to the form
- **Problem**: Distance was not recalculated when loading toki details, only using stale data from `state.tokis` or missing if not in state. After creating a toki, distance showed "0.0 km" until navigating back and returning.
- **Solution**:
  - **Backend**: Updated single toki GET endpoint (`/api/tokis/:id`) to calculate distance server-side:
    - Gets user's coordinates from database
    - Calculates distance in SQL query using Haversine formula (same as list endpoint)
    - Returns distance in response as `{km, miles}` object
  - **Frontend**: Updated distance calculation priority in `loadTokiData`:
    1. **Priority 1**: Use distance from API response (most accurate, always up-to-date from backend)
    2. **Priority 2**: Fallback to distance from `state.tokis` (matches card display)
    3. **Priority 3**: Calculate on client side if coordinates available but no distance provided
  - Imported `calculateDistance` function from `@/utils/distance` for client-side fallback
  - This ensures distance is always accurate immediately after creation, without needing to navigate away and back
- **Problem**: Share button opened custom modal on all platforms, but iOS users expect native share sheet for better integration with iOS apps
- **Solution**:
  - Added `Platform` import from `react-native` to detect iOS platform
  - Modified `handleShareToki` function to check `Platform.OS === 'ios'`
  - On iOS: Uses native `RNShare.share()` with formatted message and URL, providing native iOS share sheet with all available sharing options
  - On web/Android: Continues to show custom modal with social media buttons and editable message
  - This provides platform-appropriate sharing experience: native iOS share sheet on iOS, custom modal on other platforms
- **Problem**: Deep links to Toki details pages (e.g., `https://toki-app.com/toki-details?tokiId=...`) were not working correctly. The `tokiId` parameter was sometimes lost, especially when `useLocalSearchParams()` didn't capture it properly on web.
- **Solution**:
  - Added `getUrlParams()` helper function that directly parses `window.location.href` to extract URL parameters (web-compatible)
  - Created `effectiveParams` object that merges `params` (from `useLocalSearchParams()`) with `urlParams` (from direct URL parsing), using `params` values first and falling back to `urlParams`
  - Replaced all references to `params.tokiId` with `effectiveParams.tokiId` throughout the component
  - Also applied the same fallback logic to `title`, `location`, and `time` parameters for consistency
  - This ensures that even if Expo Router's `useLocalSearchParams()` doesn't capture the parameters correctly, the component can still read them directly from the URL
- **Problem**: Need to debug why share links redirect to explore page. Too many verbose logs making it hard to see the flow.
- **Solution**: 
  - Added component mount/unmount tracking to see when toki-details component is rendered or removed
  - Added detailed logging in useEffect that loads data, showing all parameter sources (effectiveParams, params, urlParams)
  - Added warning logs when tokiId is missing (which would cause component to not load)
  - Cleaned up verbose logs in `loadTokiData` function (removed ownership check and invite button logs)
  - Enhanced error logging to show HTTP status codes
  - Added success log when toki data loads successfully
  - These logs help identify exactly when and why the component fails to load, leading to redirect to explore page
- problem: App crashes on real iOS device when navigating to toki-details page, but works fine on simulator. No logs appear, suggesting crash happens during component initialization. Root cause: `window.open()` calls and unsafe `window.location.href` access that don't exist in React Native.
- solution:
  - Fixed `getUrlParams()` function to safely check for `window.location.href` existence and validate URL format before creating `new URL()` object
  - Added platform checks to all `window.open()` calls: check `Platform.OS === 'web'` and verify `window.open` exists before calling it
  - Replaced all `window.open()` calls on native platforms with `Linking.openURL()` which is the React Native way to open URLs
  - Fixed console.log statements to safely access `window.location?.href` using optional chaining
  - Applied fixes to all share functions (`shareToTwitter`, `shareToFacebook`, `shareToLinkedIn`, `shareToWhatsApp`, `shareToTelegram`) and all share modal button handlers
  - Added error handling with `.catch()` for `Linking.openURL()` calls to prevent crashes if URL can't be opened
- **Problem**: Invite links generated in the backend used hardcoded URLs that didn't respect the frontend deployment configuration (local/customDomain/githubPages), causing incorrect URLs in different environments.
- **Solution**: Updated invite link handling to reconstruct URLs on the frontend using deployment configuration, following the same pattern as share URLs.

### How Fixes Were Implemented
- **Problem**: Invite links didn't use deployment configuration for URL generation
- **Solution**:
  - Added `reconstructInviteLink()` helper function that takes an invite link object and reconstructs the `inviteUrl` using `generateInviteLinkUrl()` from `@/utils/tokiUrls`
  - Updated `loadInviteLinks()` to reconstruct URLs for all links and the active link after receiving data from backend
  - Updated `handleRegenerateInviteLink()` and `handleCreateInviteLink()` to reconstruct the URL when setting the active invite link
  - Imported `generateInviteLinkUrl` from `@/utils/tokiUrls` which uses `config.frontend.baseUrl` (from deployment-config)
  - This ensures invite links use the correct base URL based on the current deployment environment (local development, custom domain, or GitHub Pages)
- **Problem**: iOS share sheet was showing the URL twice - once in the message and once as a separate attachment. This happened because both `message` (which already contained the URL) and `url` parameters were being passed to `RNShare.share()`.
- **Solution**: 
  - Removed the `url` parameter from `RNShare.share()` calls on iOS, keeping only the `message` parameter which already contains the URL
  - Applied the fix to both the main share function and the fallback share function
  - Added comments explaining why the `url` parameter was removed to prevent future duplication
  - This ensures iOS share sheet shows the URL only once, embedded in the message text
- **Problem**: TypeScript linter errors for `fromEdit` and `fromCreate` properties not existing on `effectiveParams` type
- **Solution**: Added `fromEdit` and `fromCreate` properties to the `effectiveParams` object definition, reading from both `params` and `urlParams` with the same fallback pattern as other parameters