# File: chat.tsx

### Summary
This file contains the Chat screen component that handles both individual user conversations and group chats. It displays messages in a chat interface with real-time message sending capabilities.

### Fixes Applied log
- **problem**: Chat screen was hardcoded to show "Sunset Beach Volleyball" and used old message format
- **solution**: Updated to use route parameters to display correct conversation details and real message data from API

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

The chat screen now properly handles individual conversations and displays real message data from the backend API.

### Additional Improvements Made:
- **problem**: Messages reloaded completely after sending, causing loading screen
- **solution**: Added optimistic updates - new messages appear immediately in local state without API reload

- **problem**: Enter key didn't send messages
- **solution**: Added `onSubmitEditing`, `blurOnSubmit={false}`, and `returnKeyType="send"` to TextInput

- **problem**: Chat bubbles lacked visual polish
- **solution**: Improved message bubble styling with shadows, better borders, and refined spacing

- **problem**: Input area looked basic
- **solution**: Enhanced input container with shadows, better border radius, and improved send button styling

The chat now provides a smooth, modern messaging experience with instant message display and intuitive keyboard controls. 