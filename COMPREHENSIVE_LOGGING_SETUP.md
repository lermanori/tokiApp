# Comprehensive Real-Time Messaging Logging Setup

## 🎯 **Overview**
We've added comprehensive logging throughout the real-time messaging system to track every step of the message flow - from backend emission to frontend reception. This will help debug any issues with real-time messaging.

## 📤 **Backend Logging (Server Side)**

### **1. Message Route Emission Logging**
**File**: `toki-backend/src/routes/messages.ts`

#### **Individual Messages (conversation-{id})**
```typescript
console.log('📤 [BACKEND] SENDING EVENT: message-received');
console.log('📤 [BACKEND] Room: conversation-', conversationId);
console.log('📤 [BACKEND] Sender ID:', req.user!.id);
console.log('📤 [BACKEND] Message data:', messageData);
console.log('📤 [BACKEND] Room members in', roomName, ':', roomMembers ? roomMembers.size : 0, 'users');
console.log('✅ [BACKEND] Event message-received sent to room:', roomName);
```

#### **Group Messages (toki-{id})**
```typescript
console.log('📤 [BACKEND] SENDING EVENT: toki-message-received');
console.log('📤 [BACKEND] Room: toki-', tokiId);
console.log('📤 [BACKEND] Sender ID:', req.user!.id);
console.log('📤 [BACKEND] Message data:', messageData);
console.log('📤 [BACKEND] Room members in', roomName, ':', roomMembers ? roomMembers.size : 0, 'users');
console.log('✅ [BACKEND] Event toki-message-received sent to room:', roomName);
```

### **2. Socket.io Room Management Logging**
**File**: `toki-backend/src/index.ts`

#### **Room Join Events**
```typescript
// User joins personal room
console.log(`👤 [BACKEND] User ${userId} (socket: ${socket.id}) joined room: ${roomName}`);
console.log(`👤 [BACKEND] Room ${roomName} now has ${roomMembers ? roomMembers.size : 0} members`);

// User joins conversation room
console.log(`💬 [BACKEND] User (socket: ${socket.id}) joined conversation room: ${roomName}`);
console.log(`💬 [BACKEND] Room ${roomName} now has ${roomMembers ? roomMembers.size : 0} members`);

// User joins Toki group chat
console.log(`🏷️ [BACKEND] User (socket: ${socket.id}) joined Toki chat room: ${roomName}`);
console.log(`🏷️ [BACKEND] Room ${roomName} now has ${roomMembers ? roomMembers.size : 0} members`);
```

#### **Room Leave Events**
```typescript
console.log(`🚪 [BACKEND] User (socket: ${socket.id}) left room: ${roomName}`);
console.log(`🚪 [BACKEND] Room ${roomName} now has ${roomMembers ? roomMembers.size : 0} members`);
```

## 📱 **Frontend Logging (Client Side)**

### **1. Socket Service Logging**
**File**: `services/socket.ts`

#### **Connection Events**
```typescript
console.log('🔌 [FRONTEND] WebSocket connected, socket ID:', this.socket?.id);
```

#### **Room Join Events**
```typescript
console.log('🔌 [FRONTEND] Attempting to join conversation:', conversationId);
console.log('🔌 [FRONTEND] Socket connected:', this.isConnected);
console.log('🔌 [FRONTEND] Socket instance:', !!this.socket);
console.log('👤 [FRONTEND] Joined conversation room:', roomName);
console.log('👤 [FRONTEND] Current rooms:', Array.from(this.currentRooms));

console.log('🏷️ [FRONTEND] Joined Toki chat room:', roomName);
console.log('🏷️ [FRONTEND] Current rooms:', Array.from(this.currentRooms));
```

#### **Event Listener Setup**
```typescript
console.log('👂 [FRONTEND] Setting up message-received listener');
console.log('👂 [FRONTEND] Setting up toki-message-received listener');
```

#### **Event Reception**
```typescript
// Individual messages
console.log('📨 [FRONTEND] RECEIVED EVENT: message-received');
console.log('📨 [FRONTEND] Message data:', message);
console.log('📨 [FRONTEND] Current rooms:', Array.from(this.currentRooms));

// Group messages
console.log('📨 [FRONTEND] RECEIVED EVENT: toki-message-received');
console.log('📨 [FRONTEND] Message data:', message);
console.log('📨 [FRONTEND] Current rooms:', Array.from(this.currentRooms));
```

### **2. Chat Screen Logging**
**File**: `app/chat.tsx`

#### **Real-Time Message Reception**
```typescript
console.log('📨 [CHAT SCREEN] Real-time Toki message received:', newMessage);
console.log('📨 [CHAT SCREEN] Sender ID:', newMessage.sender_id);
console.log('📨 [CHAT SCREEN] Current user ID:', state.currentUser?.id);
console.log('📨 [CHAT SCREEN] Message content:', newMessage.content);
console.log('🔍 [CHAT SCREEN] WEBSOCKET MESSAGE INSPECTION:');
console.log('📨 [CHAT SCREEN] Full WebSocket message object:', JSON.stringify(newMessage, null, 2));
```

### **3. Messages Page Logging**
**File**: `app/(tabs)/messages.tsx`

#### **Individual Message Reception**
```typescript
console.log('📨 [MESSAGES PAGE] RECEIVED EVENT: message-received');
console.log('📨 [MESSAGES PAGE] Message structure:', {
  conversation_id: message.conversation_id,
  content: message.content,
  created_at: message.created_at,
  sender_name: message.sender_name,
  sender_id: message.sender_id
});
console.log('📨 [MESSAGES PAGE] Current user ID:', state.currentUser?.id);
console.log('📨 [MESSAGES PAGE] Current conversations:', conversations.map(c => ({ id: c.id, other_user_name: c.other_user_name })));
```

#### **Group Message Reception**
```typescript
console.log('📨 [MESSAGES PAGE] RECEIVED EVENT: toki-message-received');
console.log('📨 [MESSAGES PAGE] Message structure:', {
  toki_id: message.toki_id,
  content: message.content,
  created_at: message.created_at,
  sender_name: message.sender_name,
  sender_id: message.sender_id
});
console.log('📨 [MESSAGES PAGE] Current user ID:', state.currentUser?.id);
console.log('📨 [MESSAGES PAGE] Current Toki group chats:', tokiGroupChats.map(t => ({ id: t.id, title: t.title })));
```

## 🔍 **What the Logs Will Show You**

### **Complete Message Flow Tracking**
1. **Backend**: When a message is sent via API
2. **Backend**: Which room the event is sent to
3. **Backend**: How many users are in that room
4. **Frontend**: When a user joins/leaves a room
5. **Frontend**: Which rooms the user is currently in
6. **Frontend**: When events are received
7. **Frontend**: Message details and user context

### **Debugging Information**
- **Room membership**: See exactly who's in each room
- **Event flow**: Track events from backend to frontend
- **User context**: Know which user is sending/receiving
- **Room state**: Monitor room join/leave operations
- **Message data**: Inspect full message objects

## 🧪 **Testing the Logging**

### **Test Scenario: Send a Group Message**
1. **User A sends message** → Backend logs emission
2. **User A joins room** → Backend logs room join
3. **User B joins room** → Backend logs room join  
4. **Message sent** → Backend logs event emission
5. **User A receives** → Frontend logs event reception
6. **User B receives** → Frontend logs event reception

### **Expected Log Output**
```
📤 [BACKEND] SENDING EVENT: toki-message-received
📤 [BACKEND] Room: toki-123
📤 [BACKEND] Sender ID: user-A-id
📤 [BACKEND] Room members in toki-123: 2 users
✅ [BACKEND] Event toki-message-received sent to room: toki-123

📨 [FRONTEND] RECEIVED EVENT: toki-message-received
📨 [FRONTEND] Message data: {...}
📨 [FRONTEND] Current rooms: ["toki-123"]
```

## 🎯 **Benefits of This Logging**

1. **Complete Visibility**: See every step of the real-time flow
2. **User Context**: Know who's sending/receiving messages
3. **Room Management**: Track room membership and changes
4. **Event Flow**: Follow events from backend to frontend
5. **Debugging**: Quickly identify where issues occur
6. **Performance**: Monitor room sizes and event delivery

This comprehensive logging will make it much easier to debug any real-time messaging issues and understand exactly how the system is working!
