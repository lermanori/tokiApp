# File: chat.tsx

### Summary
This file contains the chat screen component for individual and group messages. It displays messages for a specific conversation/Toki group and manages joining/leaving the relevant Socket.io room and listening for real-time updates.

### Fixes Applied log
- problem: Conversations were created as soon as user tapped "Chat" from various places.
- solution: Added support for deferred conversation creation; chat now creates the conversation only when the first message is sent.
- **problem**: Fixed linter errors related to 'c' being of type 'unknown' in Array.from().map() calls.
- **solution**: Added proper type checking and type assertion for created_at field before using Array.from().

### How Fixes Were Implemented
- problem: Chat required `conversationId` to exist to send messages.
- solution: Introduced `dynamicConversationId` local state. If missing, on first send the component calls `actions.startConversation(otherUserId)`, joins the socket room, sends the message, and refreshes conversations so it appears in the list.
- **problem**: The Array.from() method was creating arrays of 'unknown' type, causing TypeScript errors when trying to map over the characters.
- **solution**: Added explicit type checking (`typeof messagesData[0].created_at === 'string'`) and type assertion (`as string`) to ensure the Array.from() method works with properly typed strings.
- **problem**: Multiple instances of the same error pattern existed in the file for both Toki messages and conversation messages.
- **solution**: Applied the same fix pattern to all four occurrences: two in the loadMessages function (for Toki and conversation messages) and two in the WebSocket message handlers (for both message types).

The fix ensures that the charCodes logging only attempts to process string values and properly types the array elements for the map function.

### Clickable Group Chat Title
- **problem**: Group chat titles were not clickable, making it difficult to navigate to the toki details from the chat screen.
- **solution**: Made both group chat and individual chat titles clickable with underline styling.

### How Fixes Were Implemented
- **problem**: The header title was only clickable for individual chats, and group chat titles had `disabled={isGroup}` preventing interaction.
- **solution**: 
  - Removed the `disabled` prop
  - Updated the `onPress` handler to check if it's a group chat with `tokiId`
  - For group chats: Navigate to `/toki-details` with the `tokiId` parameter (using `tokiId` key to match what toki-details expects)
  - For individual chats: Navigate to `/user-profile/[userId]` with the `otherUserId` parameter
  - Applied underline styling to both group and individual chat titles for consistent visual feedback
  - Both types of chats now have clickable, underlined titles that navigate to their respective detail pages
  - Fixed parameter name from `id` to `tokiId` to match the expected parameter in toki-details screen

### Fixed "Mark as Read" Error for Empty Chats
- **problem**: Chat screen was trying to mark chats as read even when there were no messages, causing backend error "This Toki has no messages".
- **solution**: Added check to only call mark as read functions when there are actually messages in the chat.

### How Fixes Were Implemented
- **problem**: Multiple places in the code were calling `markTokiAsRead` or `markConversationAsRead` regardless of whether messages existed:
  1. `useFocusEffect` hook on screen focus
  2. `loadMessages` function after loading messages
  3. `debouncedMarkAsRead` function
  4. Periodic timer (30-second interval)
- **solution**:
  - Added `messages.length === 0` check in all four locations
  - `debouncedMarkAsRead`: Check at the start and return early if no messages
  - `loadMessages`: Only call mark as read if `messagesData.length > 0` for both Toki and conversation messages
  - `useFocusEffect`: Check at the start of callback and in periodic timer
  - Added `messages.length` to the dependency array to re-evaluate when messages are loaded
  - Now only attempts to mark as read when there are actual messages to mark
  - All locations log skip messages for debugging 