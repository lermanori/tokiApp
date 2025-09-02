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