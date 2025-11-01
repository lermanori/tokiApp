# File: MetaTags.tsx

### Summary
This file contains the MetaTags component that handles dynamic meta tag updates for web platforms. It generates and updates HTML meta tags for social media sharing and SEO purposes.

### Fixes Applied log
- **problem**: Fixed ReferenceError: Property 'document' doesn't exist on iOS
- **solution**: Added proper platform detection to only run web-specific code when Platform.OS === 'web' and document is available

### How Fixes Were Implemented
- **problem**: The component was trying to access `document` object in React Native environment where it doesn't exist
- **solution**: 
  1. Added Platform import from 'react-native'
  2. Enhanced the useEffect guard condition to check Platform.OS !== 'web' 
  3. Added additional check for typeof document === 'undefined'
  4. This ensures the component only executes web-specific DOM manipulation code when running on web platform

The fix prevents the ReferenceError by ensuring the component gracefully exits early on mobile platforms while still functioning correctly on web.




