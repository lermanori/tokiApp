# File: services/api.ts

### Summary
API service layer with TypeScript interfaces and API client methods for communicating with the backend.

### Fixes Applied log
- **problem**: Toki interface didn't include friendsAttending field from backend responses.
- **solution**: Added `friendsAttending?: Array<{ id: string; name: string; avatar?: string }>` to Toki interface.

### How Fixes Were Implemented
- **problem**: TypeScript interface mismatch when backend started returning friendsAttending data.
- **solution**: Added optional friendsAttending field to Toki interface to match backend response structure, allowing frontend to properly type and use friends data.

- **problem**: Toki interface joinStatus type included 'joined' status which was deprecated in favor of 'approved'.
- **solution**: Removed 'joined' from joinStatus type definition, standardizing on 'not_joined', 'pending', and 'approved' as the only valid statuses.
