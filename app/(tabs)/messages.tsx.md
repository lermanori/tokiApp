# File: messages.tsx

### Summary
This file contains the Messages screen component that displays conversations and Toki group chats. It has been refactored to use global state management for real-time updates instead of local socket listeners.

### Fixes Applied log
- **Problem**: Messages screen was not updating in real-time when new messages arrived
- **Solution**: Moved socket listeners from local component to global AppContext and updated component to consume global state

- **Problem**: Component was using local useState for conversations and tokiGroupChats
- **Solution**: Replaced local state with global state from AppContext (state.conversations and state.tokiGroupChats)

- **Problem**: Functions were trying to call non-existent setConversations and setTokiGroupChats
- **Solution**: Updated functions to use global actions (actions.getConversations() and actions.getTokiGroupChats())

- **Problem**: Linter errors due to missing properties in AppState interface
- **Solution**: Added conversations and tokiGroupChats properties to AppState interface and initial state

### How Fixes Were Implemented
1. **Global State Integration**: 
   - Removed local useState for conversations and tokiGroupChats
   - Component now directly consumes state.conversations and state.tokiGroupChats from AppContext
   - This ensures real-time updates are reflected immediately when global state changes

2. **Socket Listener Centralization**:
   - Removed all local socket connection and listener setup logic
   - Socket listeners are now handled globally in AppContext.tsx
   - Component logs indicate that WebSocket functionality is handled globally

3. **Action-Based Updates**:
   - loadConversations() function now calls global actions without trying to set local state
   - handleConversationPress() and handleTokiGroupChatPress() refresh data by calling global actions
   - This ensures data consistency across the app

4. **State Management**:
   - Added conversations and tokiGroupChats to AppState interface
   - Added corresponding reducer cases (SET_CONVERSATIONS, SET_TOKI_GROUP_CHATS)
   - Updated getConversations() and getTokiGroupChats() actions to dispatch state updates

The component now properly displays real-time message updates without requiring users to manually refresh or navigate between screens, as the global socket listeners automatically update the state when new messages arrive. 