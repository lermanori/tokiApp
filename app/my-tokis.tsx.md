# File: app/my-tokis.tsx

### Summary
My Tokis screen component displaying user's hosted and joined events with filtering by status.

### Fixes Applied log
- **problem**: joinStatus type and logic included 'joined' status which was deprecated in favor of 'approved', causing filtering inconsistencies.
- **solution**: Removed 'joined' from joinStatus type definition. Updated getMyTokisStatus to check only 'approved' instead of 'joined' || 'approved'. Updated normalizedStatus calculation to check only 'approved'.

### How Fixes Were Implemented
- **problem**: Status filtering logic checked for both 'joined' and 'approved' statuses.
- **solution**: Changed all status checks to only use 'approved'. The return value 'joined' for the filter label is kept as it's just a UI label, not a status value.
