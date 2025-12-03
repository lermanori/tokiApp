# File: app/saved-tokis.tsx

### Summary
Saved Tokis screen component displaying user's saved/bookmarked events.

### Fixes Applied log
- **problem**: joinStatus type cast included 'joined' status which was deprecated in favor of 'approved'.
- **solution**: Removed 'joined' from joinStatus type cast, standardizing on 'not_joined', 'pending', and 'approved'.

### How Fixes Were Implemented
- **problem**: Type assertion for joinStatus included deprecated 'joined' status.
- **solution**: Updated type cast to only include valid statuses: 'not_joined', 'pending', and 'approved'.
