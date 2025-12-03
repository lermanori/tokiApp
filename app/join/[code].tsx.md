# File: app/join/[code].tsx

### Summary
Join flow screen component for joining Tokis via invite code.

### Fixes Applied log
- **problem**: Status check included 'joined' status which was deprecated in favor of 'approved', causing incorrect participant detection.
- **solution**: Updated isAlreadyIn check to only check for 'approved' status instead of 'joined' || 'approved'.

### How Fixes Were Implemented
- **problem**: Participant check logic checked for both 'joined' and 'approved' statuses.
- **solution**: Changed status check to only use 'approved' when determining if user is already a participant of the Toki.
