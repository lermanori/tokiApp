# File: services/api.ts

### Summary
This file contains the API service class that handles all HTTP requests to the backend. The getNearbyTokis method now supports pagination. User data caching has been added to reduce redundant `/auth/me` API calls.

### Fixes Applied log
- problem: getNearbyTokis method did not support page parameter and did not return pagination metadata.
- solution: Added `page?: number` parameter to getNearbyTokis method and updated return type to include pagination object with total count and hasMore flag.

- **problem**: Missing API method to request password reset links
- **solution**: Added `forgotPassword(email: string)` method that sends POST request to `/auth/forgot-password` endpoint, returning success status and message

- **problem**: Excessive calls to `/auth/me` endpoint causing unnecessary network traffic and server load. Multiple concurrent calls were being made simultaneously (e.g., 6 calls on refresh).
- **solution**: Implemented user data caching with 60-second TTL and request deduplication. `getCurrentUser()` now checks cache first and prevents concurrent duplicate requests by reusing pending promises. `isAuthenticated()` reuses user cache when available. `getUserStats()` now uses cached `getCurrentUser()` instead of separate API call. Cache is automatically invalidated on token changes and profile updates.

- **problem**: Session expiration issues on native platforms - users were being logged out unnecessarily when network errors occurred during token refresh. The `refreshAccessToken()` method was clearing tokens on any error, including network failures, causing false logouts.
- **solution**: Updated `refreshAccessToken()` to distinguish between network errors and actual authentication failures. Tokens are now only cleared when the refresh token is confirmed to be expired/invalid (401 status). Network errors (TypeError, fetch failures, timeouts) no longer trigger token clearing, preventing unnecessary logouts on native platforms with unreliable network connectivity.

### How Fixes Were Implemented
- Added `page?: number` parameter to `getNearbyTokis()` method signature
- Updated return type to include `pagination` object: `{ page, limit, total, totalPages, hasMore }`
- Updated TypeScript type definitions to match backend response structure

- Added `forgotPassword(email: string)` method that sends POST request to `/auth/forgot-password` endpoint

- Added `userCache` property to ApiService class with 60-second cache duration
- Added `pendingGetCurrentUser` promise tracker to prevent concurrent duplicate requests
- Modified `getCurrentUser()` to: (1) check cache first, (2) reuse pending request if one exists, (3) accept optional `forceRefresh` parameter
- Updated `isAuthenticated()` to check user cache before making API calls, and use `getCurrentUser()` instead of bare `/auth/me` call to cache user data
- Modified `getUserStats()` to reuse `getCurrentUser()` instead of making separate API call
- Added `clearUserCache()` method that's called automatically on token changes and profile updates, which also clears pending requests
- Cache is cleared when tokens are saved (login/register) or cleared (logout)
- Request deduplication ensures only 1 API call is made even when multiple components call `getCurrentUser()` simultaneously

- Modified `refreshAccessToken()` to check response status before clearing tokens
- Added network error detection using `TypeError` instance check and error message pattern matching
- Tokens are only cleared on confirmed 401 (Unauthorized) responses, indicating refresh token is expired/invalid
- Network errors (TypeError, fetch failures, timeouts) preserve tokens to prevent false logouts
- Other HTTP errors (500, 503, etc.) also preserve tokens as they may indicate server issues rather than auth problems
