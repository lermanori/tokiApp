# File: services/api.ts

### Summary
This file contains the API service class that handles all HTTP requests to the backend. The getNearbyTokis method now supports pagination.

### Fixes Applied log
- problem: getNearbyTokis method did not support page parameter and did not return pagination metadata.
- solution: Added `page?: number` parameter to getNearbyTokis method and updated return type to include pagination object with total count and hasMore flag.

### How Fixes Were Implemented
- Added `page?: number` parameter to `getNearbyTokis()` method signature
- Updated return type to include `pagination` object: `{ page, limit, total, totalPages, hasMore }`
- Updated TypeScript type definitions to match backend response structure
