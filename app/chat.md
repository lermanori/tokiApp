# File: chat.tsx

### Summary
This file contains the Chat screen component that handles both individual user conversations and group chats. It displays messages in a chat interface with real-time message sending capabilities and message reporting functionality.

### Fixes Applied log
- **problem**: Chat screen was hardcoded to show "Sunset Beach Volleyball" and used old message format
- **solution**: Updated to use route parameters to display correct conversation details and real message data from API

- **problem**: Message reporting used long-press gesture which was not discoverable
- **solution**: Added visible Flag icon button next to each message for easy reporting

- **problem**: Message reports weren't showing in admin panel
- **solution**: Backend endpoint now uses unified `content_reports` table (handled in messages.ts)

### How Fixes Were Implemented
- **problem**: Added route parameter handling to get conversationId, otherUserName, and isGroup from navigation
- **solution**: Used `useLocalSearchParams()` to extract conversation details from the navigation route

- **problem**: Chat screen was using old message format with `message.text` and `message.isOwn`
- **solution**: Updated to use new API message format with `message.content`, `message.sender_id`, and `message.sender_name`

- **problem**: Messages were not loading from the API
- **solution**: Added `loadMessages()` function that calls `actions.getConversationMessages()` and displays loading state

- **problem**: Message sending was using old API method
- **solution**: Updated to use `actions.sendConversationMessage()` and reload messages after sending

- **problem**: Header was hardcoded to show "Sunset Beach Volleyball" and "8 participants"
- **solution**: Dynamic header that shows the other user's name and conversation type (Direct message/Group chat)

- **problem**: Message timestamps were not formatted correctly
- **solution**: Added proper timestamp formatting using `new Date(message.created_at).toLocaleTimeString()`

- **problem**: Long-press gesture for reporting was not user-friendly or discoverable
- **solution**: Added Flag icon button that appears next to each message (only for other users' messages)

- **problem**: Message bubble layout didn't accommodate the report button
- **solution**: Wrapped message bubble and flag button in `messageContent` view with flexDirection row and gap

The chat screen now properly handles individual conversations, displays real message data, and provides an intuitive one-tap reporting mechanism.

### Additional Improvements Made:
- **problem**: Messages reloaded completely after sending, causing loading screen
- **solution**: Added optimistic updates - new messages appear immediately in local state without API reload

- **problem**: Enter key didn't send messages
- **solution**: Added onKeyPress and onSubmitEditing handlers to send message on Enter key
- **solution**: Added `onSubmitEditing`, `blurOnSubmit={false}`, and `returnKeyType="send"` to TextInput

- **problem**: Chat bubbles lacked visual polish
- **solution**: Improved message bubble styling with shadows, better borders, and refined spacing

- **problem**: Input area looked basic
- **solution**: Enhanced input container with shadows, better border radius, and improved send button styling

The chat now provides a smooth, modern messaging experience with instant message display and intuitive keyboard controls.

### Latest Fixes Applied:
- **problem**: Users button in header had no functionality - clicking it did nothing, and it was showing on individual chats where it shouldn't
- **solution**: Added participants modal functionality that opens when Users button is clicked in group chats, and made the button conditionally render only for group chats (`isGroup && tokiId`)

### How Latest Fixes Were Implemented:
- **problem**: Users button in chat header was not interactive
- **solution**: Added `onPress` handler to Users button that opens participants modal for group chats

- **problem**: No way to view participants in group chat
- **solution**: Integrated `ParticipantsModal` component that displays all participants with search functionality

- **problem**: Participants data not available in chat screen
- **solution**: Added `loadTokiParticipants()` function that fetches toki data using `actions.getTokiById()` and maps participants to modal format

- **problem**: Host was not included in participants list and didn't appear first
- **solution**: Updated `loadTokiParticipants()` to include host in the list (if not already present), mark host with `isHost: true`, and sort participants so host appears first in the list

- **problem**: Host users couldn't remove participants from group chat
- **solution**: Added `handleRemoveParticipant()` function with confirmation dialog that calls `actions.removeParticipant()` and refreshes the participants list

- **problem**: No state management for participants modal
- **solution**: Added state variables: `showParticipantsModal`, `participantsSearch`, `tokiParticipants`, `isLoadingParticipants`, and `isUserHost` to manage modal state and participant data

The chat screen now allows users to view and manage participants in group chats directly from the chat interface. 