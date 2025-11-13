# File: MetaTags.tsx

### Summary
This file contains the MetaTags component that handles dynamic meta tag updates for web platforms. It generates and updates HTML meta tags for social media sharing and SEO purposes.

### Fixes Applied log
- **problem**: Fixed ReferenceError: Property 'document' doesn't exist on iOS
- **solution**: Added proper platform detection to only run web-specific code when Platform.OS === 'web' and document is available
- **problem**: Universal links only show small banner, need more prominent way to open app
- **solution**: Added Smart App Banner meta tag (`apple-itunes-app`) that creates a prominent banner at the top of Safari/Chrome iOS, more noticeable than the small universal link banner

### How Fixes Were Implemented
- **problem**: The component was trying to access `document` object in React Native environment where it doesn't exist
- **solution**: 
  1. Added Platform import from 'react-native'
  2. Enhanced the useEffect guard condition to check Platform.OS !== 'web' 
  3. Added additional check for typeof document === 'undefined'
  4. This ensures the component only executes web-specific DOM manipulation code when running on web platform

The fix prevents the ReferenceError by ensuring the component gracefully exits early on mobile platforms while still functioning correctly on web.

- **problem**: Universal links only show small banner, need more prominent way to open app
- **solution**: 
  1. Added `APP_STORE_ID` constant (configurable, currently placeholder)
  2. Created `updateSmartAppBanner()` function that adds `apple-itunes-app` meta tag
  3. Meta tag format: `app-id=APP_STORE_ID, app-argument=CURRENT_URL`
  4. Gets current URL from `window.location.href` or falls back to metaTags.url
  5. Only adds banner if App Store ID is configured (not placeholder)
  6. Smart App Banner appears automatically on all pages that use MetaTags component
  7. More prominent than the small universal link banner, provides better user experience for opening app




