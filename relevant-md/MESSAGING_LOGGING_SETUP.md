# MESSAGING LOGGING SETUP

## Overview
This document explains the comprehensive logging system we've implemented to track why the Messages page isn't showing incoming messages in real-time.

## 🔍 What We're Logging

### 1. **WebSocket Connection & Events** (`services/socket.ts`)
- **Connection attempts** and status
- **Socket ID** and connection state
- **Room joining/leaving** operations
- **Message event reception** with detailed data

### 2. **Global Message Listeners** (`contexts/AppContext.tsx`)
- **WebSocket listener setup** and configuration
- **Message reception events** with message structure
- **API calls** triggered by new messages
- **State update triggers** for conversations and toki group chats

### 3. **API Service Calls** (`contexts/AppContext.tsx`)
- **getConversations()** calls with detailed response data
- **getTokiGroupChats()** calls with detailed response data
- **API response structure** and data mapping

### 4. **State Management** (`contexts/AppContext.tsx`)
- **Reducer actions** for SET_CONVERSATIONS and SET_TOKI_GROUP_CHATS
- **State update details** with conversation/chat data
- **Payload validation** and data structure

### 5. **Messages Screen Component** (`app/(tabs)/messages.tsx`)
- **Component lifecycle** (mount/unmount)
- **State change detection** and re-renders
- **Manual refresh operations**
- **Global state synchronization**

## 📊 Logging Flow

### **When a Message is Received:**

1. **WebSocket Event** → `📨 [FRONTEND] RECEIVED EVENT: message-received`
2. **AppContext Listener** → `📨 [APP CONTEXT] RECEIVED EVENT: message-received`
3. **API Call Trigger** → `🔄 [APP CONTEXT] Updating conversations for new message`
4. **API Service Call** → `🔄 [APP CONTEXT] getConversations() called - fetching from API...`
5. **API Response** → `📥 [APP CONTEXT] getConversations() API response: {...}`
6. **State Dispatch** → `🔄 [REDUCER] SET_CONVERSATIONS - Updating state with X conversations`
7. **Component Update** → `🔄 [MESSAGES PAGE] Global state updated - conversations: X, tokiGroupChats: Y`

## 🎯 What to Look For

### **If Messages ARE Being Received:**
- You'll see the WebSocket event logs
- You'll see the AppContext listener logs
- You'll see the API calls being triggered
- You'll see the state updates in the reducer

### **If Messages Are NOT Being Received:**
- No WebSocket event logs
- No AppContext listener logs
- No API calls being triggered
- No state updates

### **If State Updates Are Happening But UI Isn't Updating:**
- You'll see all the logs above
- But the Messages screen component logs won't show re-renders
- This would indicate a React rendering issue

## 🚀 Testing the Logging

1. **Open the Messages page** in your app
2. **Send a message from another device/user** to yourself
3. **Watch the console logs** for the complete flow
4. **Look for any gaps** in the logging chain

## 🔧 Next Steps

Based on what the logs reveal:

- **If no WebSocket events**: Check backend WebSocket setup
- **If no AppContext listeners**: Check WebSocket listener setup
- **If no API calls**: Check the listener callback logic
- **If no state updates**: Check the reducer and dispatch
- **If no component updates**: Check React rendering and state binding

## 📝 Log Format

All logs use consistent emoji prefixes:
- 🔌 WebSocket connection
- 📨 Message reception
- 🔄 State updates
- 📥 API responses
- ✅ Success operations
- ❌ Error operations
- 🔍 Debug information
- 🚀 Component lifecycle
- 👂 Listener setup
