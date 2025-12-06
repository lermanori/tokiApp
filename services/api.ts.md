# File: api.ts

### Summary
This file contains the API service class that handles all backend API communication including authentication, user management, and data fetching.

### Fixes Applied log
- **problem**: `register()` method only accepted name, email, and password, but backend supports bio and location
- **solution**: Updated method signature to include optional bio and location parameters

### How Fixes Were Implemented
- Added `bio?: string` and `location?: string` as optional parameters to the `register()` method
- This allows the registration screen to pass bio and location data to the backend during direct registration
- Maintains backwards compatibility since the parameters are optional
