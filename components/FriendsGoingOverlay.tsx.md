# File: FriendsGoingOverlay.tsx

### Summary
Reusable overlay component that displays which friends (accepted connections) are attending a toki. Shows up to 3 friend avatars with overlapping design and displays "+X friends going" text. Positioned absolutely for overlay on images.

### Fixes Applied log
- **Problem**: No way to see which friends are attending a toki in the card view.
- **Solution**: Created FriendsGoingOverlay component that displays friend avatars with initials fallback and count text.

### How Fixes Were Implemented
- **Problem**: Needed a visual indicator of friends attending on toki cards and details page.
- **Solution**: Built overlay component with overlapping circular avatars (max 3 displayed), white background with shadow, and text showing friend count. Supports optional onPress handler for navigation/interaction. Uses getInitials helper for avatar fallback when no image is available.








