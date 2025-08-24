# Group Chat Message Flow Fix

## 🚨 **Problem Identified: Event Listener Conflict**

After implementing the real-time messaging fix, a new issue emerged where "something is wrong with the regular messages" in group chats. The root cause was an **Event Listener Conflict** between two screens:

### **The Conflict:**
1. **Messages Page** (`app/(tabs)/messages.tsx`) was listening to:
   - `'message-received'` (individual messages)
   - `'toki-message-received'` (group messages)

2. **Chat Screen** (`app/chat.tsx`) was also listening to:
   - `'message-received'` (individual messages)
   - `'toki-message-received'` (group messages)

3. **Result**: Both screens received the same events, causing conflicts, duplicate updates, and potentially missed messages.

## 🔧 **Solution Implemented: Event Listener Isolation**

### **1. Fixed Messages Page (`app/(tabs)/messages.tsx`)**
- **Moved `setupSocketListeners` function** outside `useEffect` for proper scope access
- **Integrated with `useFocusEffect`** to only listen when screen is focused
- **Added cleanup on focus loss** to prevent conflicts with Chat Screen

```typescript
// Socket listener setup function (moved outside useEffect for scope access)
const setupSocketListeners = () => {
  // ... listener setup logic
};

// Only listen when Messages screen is focused
useFocusEffect(
  React.useCallback(() => {
    console.log('🎯 Messages screen focused, reloading conversations...');
    loadConversations();
    
    // Set up socket listeners when screen is focused
    if (socketService.getConnectionStatus() && socketService.getSocket()) {
      console.log('🔌 Messages screen focused, setting up socket listeners...');
      setupSocketListeners();
    }
    
    // Cleanup when screen loses focus
    return () => {
      console.log('🔌 Messages screen losing focus, cleaning up socket listeners...');
      socketService.offMessageReceived();
      socketService.offTokiMessageReceived();
    };
  }, [])
);
```

### **2. Chat Screen Already Fixed (`app/chat.tsx`)**
- **Properly leaves rooms** on unmount using `useEffect` cleanup
- **Only listens when active** (no conflicts with Messages page)

## 🔄 **How Group Chat Message Flow Now Works**

### **1. Message Sending Flow:**
```
User types message → Frontend sends to backend → Backend saves to database → Backend emits socket event → Only active Chat Screen receives real-time update
```

### **2. Detailed Steps:**

1. **User Input**: User types message in group chat input field
2. **Frontend API Call**: `POST /api/messages/tokis/{tokiId}` 
3. **Backend Processing**: 
   - Save message to database
   - Get `io` instance from `req.app.get('io')`
   - Emit `'toki-message-received'` to room `toki-{tokiId}`
4. **Socket Event**: Only users in that room receive the event
5. **Frontend Update**: Chat Screen updates with new message in real-time

### **3. Room Management:**
- **When entering chat**: `socketService.joinToki(tokiId)` → joins room `toki-{tokiId}`
- **When leaving chat**: `socketService.leaveToki(tokiId)` → leaves room `toki-{tokiId}`

### **4. Event Listener Lifecycle:**
- **Messages Page**: Only listens when focused (updates conversation list)
- **Chat Screen**: Only listens when active (updates message list)
- **No Conflicts**: Each screen manages its own listeners independently

## 🧪 **Testing the Fix**

### **Test Scenario: Group Chat "toki test"**
1. **Navigate to Messages page** → Socket listeners are set up
2. **Open group chat "toki test"** → Chat Screen joins room, Messages page listeners are cleaned up
3. **Send a message** → Only Chat Screen receives real-time update
4. **Navigate back to Messages** → Chat Screen leaves room, Messages page listeners are restored
5. **Messages page updates** → Shows new message in conversation list

### **Expected Behavior:**
- ✅ **Real-time updates** work in active chat
- ✅ **No duplicate messages** or conflicts
- ✅ **Proper room management** (join/leave)
- ✅ **Event listener isolation** between screens

## 🔍 **Debugging Tips**

### **Check Console Logs:**
- `🔌 Messages screen focused, setting up socket listeners...`
- `🔌 Messages screen losing focus, cleaning up socket listeners...`
- `🔌 Joining Toki room: {tokiId}`
- `🔌 Leaving Toki room: {tokiId}`

### **Verify Room Membership:**
- Use `socketService.getCurrentRooms()` to check active rooms
- Ensure only one screen is listening to events at a time

### **Common Issues:**
- **Multiple listeners**: Check if both screens are listening simultaneously
- **Room conflicts**: Verify proper join/leave room calls
- **Event duplication**: Ensure cleanup functions are called properly

## 📱 **Current Status**

The group chat message flow has been fixed and should now work correctly with:
- ✅ **Proper event listener isolation**
- ✅ **Correct room management**
- ✅ **Real-time message updates**
- ✅ **No conflicts between screens**

The real-time messaging system is now robust and handles both individual conversations and group chats properly!
