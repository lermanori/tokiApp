# File: connections.tsx

### Summary
This file contains the Connections screen that displays user connections, pending requests, and blocked users. It includes search functionality and different tabs for managing connections.

### Fixes Applied log
-problem: Avatar rendering showed default stock photos instead of user photos or initials fallback.
-solution: Added conditional avatar rendering with initials fallback when no avatar URL exists.
-problem: Block feature was present in UI but user wanted Remove Connection instead.
-solution: Replaced Block button with Remove Connection button and hid Blocked tab from UI.
-problem: Remove button was not responding when pressed.
-solution: Added console logging to debug the button press and API call flow.
-problem: Alert.alert() doesn't work on web platform, so users couldn't see confirmation dialogs.
-solution: Replaced Alert.alert() with custom Modal components for web compatibility.
-problem: Message button navigated to messages panel instead of direct chat.
-solution: Changed handleMessagePress to navigate to chat with correct otherUserId parameter.
-problem: Message and Remove buttons had different sizes, creating visual inconsistency.
-solution: Updated Message button styling to match Remove button dimensions for consistent UI.
-problem: Buttons needed better flex alignment to ensure they appear side by side consistently.
-solution: Enhanced connectionActions container with flex: 1, justifyContent: 'flex-end', and added centering properties to both buttons.
-problem: Current user appeared in search results, allowing users to try to connect to themselves.
-solution: Added filter in getUnifiedResults() to exclude search results where user.id matches state.currentUser?.id.
-problem: Connection entry buttons were wrapping text and looked unprofessional on web and iOS.
-solution: Fixed button layout with proper minWidth constraints, improved spacing, and updated avatar fallback to neutral gray style.
-problem: Search results had both Connect and View buttons, making the UI cluttered.
-solution: Removed View button from search results. Now only shows a single stylish Connect button with icon. Avatar and name are clickable to navigate to profile page.
-problem: Star rating display was irrelevant and cluttering the connection entries.
-solution: Removed rating display (⭐ rating) from both main connection entries and pending connection requests sections.
-problem: Meta text styling in connection info had layout issues with inline styles and improper text truncation.
-solution: Created separate styles for location and Tokis meta items. Location uses flex: 1 with minWidth: 0 for proper truncation, Tokis uses flexShrink: 0 to maintain size. Added proper gap spacing and alignment.
-problem: User wanted button and name+bio to be in one flex container, with meta tags below taking full width.
-solution: Reorganized layout structure. Created `topRow` flex container containing `nameAndBio` (name + bio) and action buttons side by side. Moved `connectionMeta` below `topRow` so meta tags take full width. Updated `connectionInfo` to use flexDirection: 'column', and added `topRow` and `nameAndBio` styles.
-problem: Ellipsis were appearing on the left side instead of the right when location text was truncated.
-solution: Added `textAlign: 'left'` to `metaTextLocation` style to force left-to-right text direction and ensure ellipsis appear on the right side when text is truncated.

### How Fixes Were Implemented
-problem: All connection items used hardcoded fallback URL for avatars, making all users look the same.
-solution: Added `getUserInitials()` helper function to generate initials from user names. Updated avatar rendering logic to check if avatar URL exists and is not the default stock photo, then either show the Image component or a circular View with initials. Applied this pattern to all three sections: main connections, pending requests, and blocked users. Added `avatarFallback` and `avatarInitials` styles for the initials display.
-problem: Block button was confusing and user preferred Remove Connection functionality.
-solution: Updated `getActionButtons()` for 'friend' case to show Remove button instead of Block button. Renamed `blockButton` and `blockButtonText` styles to `removeButton` and `removeButtonText`. Commented out the Blocked tab in the tab container and replaced blocked users content with a disabled message. The `handleRemoveConnection` function was already implemented and working.
-problem: Message button had `padding: 8` and `borderRadius: 8` while Remove button had `paddingHorizontal: 12`, `paddingVertical: 6`, and `borderRadius: 6`, creating size inconsistency.
-solution: Changed Message button styling from `padding: 8, borderRadius: 8` to `paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6` to match the Remove button's proportions and create visual consistency.
-problem: Buttons needed better flex alignment and consistent sizing to appear properly side by side.
-solution: Enhanced `connectionActions` container with `flex: 1`, `justifyContent: 'flex-end'` for right alignment, and added `justifyContent: 'center'`, `alignItems: 'center'` to both `messageButton` and `removeButton` for consistent centering and alignment.
-problem: When searching for users, the current logged-in user could appear in search results, which doesn't make sense since users shouldn't connect to themselves.
-solution: Updated the condition in `getUnifiedResults()` when adding search results to also check `user.id !== state.currentUser?.id`. This ensures that the current user is filtered out from search results before they are displayed, preventing self-connection attempts.
-problem: Connection entry buttons were wrapping text and looked unprofessional on web and iOS.
-solution: Updated `connectionActions` to remove minWidth constraint. Fixed `connectButton` and `viewProfileButton` styles with proper height (36px), minWidth values, and removed flex: 1 to prevent wrapping. Updated `connectionHeader` alignment from 'flex-start' to 'center' for better visual alignment. Changed avatar fallback from purple (#8B5CF6) to neutral gray (#F3F4F6) with border (#D1D5DB) and gray initials (#6B7280) for a more professional look.
-problem: Search results had both Connect and View buttons, making the UI cluttered. User wanted a cleaner design with only a Connect button, and profile navigation via avatar/name clicks.
-solution: Removed View button from `getActionButtons()` for 'new' userType. Updated Connect button to be more stylish with: increased height (40px), larger border radius (12px), added UserPlus icon, improved shadow/elevation, better padding (20px horizontal), and flexDirection row for icon+text layout. Avatar and name were already clickable via `handleAvatarPress` and `handleNamePress` which navigate to profile page.
-problem: Star rating display (⭐ rating) was irrelevant and cluttering the connection entries UI.
-solution: Removed the rating display View from `connectionMeta` in both the main connections/search results section and the pending connections section. Now only shows location and Tokis count in the meta information.
-problem: Meta text styling had issues with inline style mixing, improper flex layout, and text truncation not working correctly for long location strings.
-solution: Replaced inline styles with proper StyleSheet styles. Created `metaItemLocation` (flex: 1, minWidth: 0) for location with proper truncation, and `metaItemTokis` (flexShrink: 0) for Tokis count. Added `metaTextLocation` style with flex: 1 and minWidth: 0 to enable proper text truncation. Restored gap: 12 in connectionMeta and gap: 4 in meta items for proper spacing.
-problem: User wanted the button and name+bio to be in one horizontal flex container, with meta tags positioned below them taking full width.
-solution: Restructured the connection card layout. Moved action buttons inside `connectionInfo` container. Created `topRow` (flexDirection: 'row') containing `nameAndBio` (flex: 1) on the left and action buttons on the right. Moved `connectionMeta` outside of `topRow` so it appears below and takes full width. Updated `connectionInfo` to use flexDirection: 'column' to stack `topRow` and `connectionMeta` vertically. Added `topRow` style with gap: 12 and `nameAndBio` style with flex: 1, minWidth: 0.

-problem: Action buttons wrapped into two lines on web/iOS causing "Conn/ect" and "Vie/w".
-solution: Made `connectionActions` non‑shrinking with a fixed minimum width, and standardized button heights and horizontal padding to keep labels on one line. Added `minWidth` for both buttons and removed `flex: 1` so the action area doesn’t steal space from the name/bio.

-problem: Avatars used a stock placeholder URL which interfered with fallback detection and styling.
-solution: Removed stock URL defaults when transforming data; now we keep `avatar` empty and rely on the initials fallback.

-problem: Avatar fallback color didn’t match the app’s neutral style and looked heavy.
-solution: Updated `avatarFallback` to a neutral gray with a subtle border and `avatarInitials` to medium gray.

-problem: Header row vertical alignment caused uneven card layouts between platforms.
-solution: Center‑aligned `connectionHeader` and added `minWidth: 0` on `connectionInfo` to allow proper truncation.

-problem: Pending connection requests in the "All" tab were rendering without name and bio, while they displayed correctly in the "Pending" tab.
-solution: Fixed the `getUnifiedResults()` function to properly extract requester data from pending connections. Changed from directly accessing `pending.requester?.name` to first extracting `const requester = pending.requester` and then accessing properties with optional chaining, ensuring consistent data access pattern matching the Pending tab implementation.

-problem: Pending requests in the "All" tab had weird styling/layout issues on both platforms - buttons were trying to fit inline with name/bio in the topRow, which didn't work well for the full-width Accept/Decline buttons.
-solution: Restructured the rendering logic to use conditional layouts. For pending requests, use a layout similar to the Pending tab with buttons below the content instead of inline. Added `requestedAt` field to UnifiedUser interface to display "Requested [date]" for pending requests. Updated `getActionButtons()` to return null for pending requests since they're handled separately. The pending request layout now shows name, bio, Tokis count, and requested date, with Accept/Decline buttons below in a full-width row, matching the Pending tab design.
