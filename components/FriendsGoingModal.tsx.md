# File: FriendsGoingModal.tsx

### Summary
Modal component that displays a full list of all friends who are attending a toki. Includes search functionality, avatar display with initials fallback, and navigation to user profiles. Similar design pattern to ParticipantsModal.

### Fixes Applied log
- **Problem**: Users couldn't see a complete list of friends attending a toki.
- **Solution**: Created FriendsGoingModal component with search, friend list, and profile navigation.

### How Fixes Were Implemented
- **Problem**: Overlay only shows 3 friends, need a way to see all friends going.
- **Solution**: Built modal component with search input, scrollable friend list showing avatars and names, clickable rows that navigate to user profiles, and friend count display. Follows same design patterns as ParticipantsModal for consistency.





