// Phase-2 hook extraction. Slice from contexts/AppContext.tsx lines 248-446.
// setupGlobalMessageListeners, joinTokiGroupChatRooms, reestablishGlobalListeners.
// (testWebSocketListeners moved to useMiscActions to keep imports lean here.)
// Heavily uses actionsRef to call cross-hook handlers (getConversations, getTokiGroupChats).

import { Dispatch, MutableRefObject } from 'react';
import { socketService } from '../../../services/socket';
import type { AppState, AppAction } from '../types';

export function useSocketActions(
  state: AppState,
  dispatch: Dispatch<AppAction>,
  actionsRef: MutableRefObject<any>,
) {
  // Helper function to join Toki group chat rooms
  const joinTokiGroupChatRooms = async (tokiGroupChats: any[]) => {
    if (!tokiGroupChats || tokiGroupChats.length === 0) {
      console.log('🏷️ [APP CONTEXT] No Toki group chats to join');
      return;
    }

    console.log('🏷️ [APP CONTEXT] Joining', tokiGroupChats.length, 'Toki group chat rooms...');

    for (const tokiChat of tokiGroupChats) {
      try {
        await socketService.joinToki(tokiChat.id);
      } catch (error) {
        console.error('❌ [APP CONTEXT] Failed to join Toki room:', tokiChat.id, error);
      }
    }

    console.log('🏷️ [APP CONTEXT] Toki group chat room joining completed');
  };

  const setupGlobalMessageListeners = async () => {
    console.log('🔌 [APP CONTEXT] Setting up global message listeners...');
    console.log('🔌 [APP CONTEXT] Current user ID:', state.currentUser?.id);
    console.log('🔌 [APP CONTEXT] WebSocket connection status:', state.isConnected);
    console.log('🔌 [APP CONTEXT] Socket service status:', socketService.getConnectionStatus());

    // Clean up any existing listeners first
    socketService.offMessageReceived();
    socketService.offTokiMessageReceived();
    socketService.offNotificationReceived();

    // Listen for new individual messages
    socketService.onMessageReceived((message: any) => {
      console.log('📨 [APP CONTEXT] RECEIVED EVENT: message-received');
      console.log('📨 [APP CONTEXT] Message structure:', {
        conversation_id: message.conversation_id,
        content: message.content,
        created_at: message.created_at,
        sender_name: message.sender_name,
        sender_id: message.sender_id
      });
      console.log('📨 [APP CONTEXT] Current user ID:', state.currentUser?.id);

      // Update conversations list if we're on the messages screen
      // This will trigger a re-render and show the new message
      if (state.currentUser?.id && message.sender_id !== state.currentUser.id) {
        console.log('🔄 [APP CONTEXT] Updating conversations for new message');

        // FRONTEND WORKAROUND: Increment unread count locally
        const currentConversations = state.conversations || [];
        const updatedConversations = currentConversations.map(conv => {
          if (conv.id === message.conversation_id) {
            return {
              ...conv,
              unread_count: (conv.unread_count || 0) + 1,
              last_message: message.content,
              last_message_time: message.created_at
            };
          }
          return conv;
        });

        // Update state immediately with incremented unread count
        dispatch({ type: 'SET_CONVERSATIONS', payload: updatedConversations });

        // Also refresh from API (but this won't have the right unread count until backend is fixed)
        actionsRef.current.getConversations();
      }
    });

    // Listen for new Toki group messages
    socketService.onTokiMessageReceived((message: any) => {
      console.log('📨 [APP CONTEXT] RECEIVED EVENT: toki-message-received');
      console.log('📨 [APP CONTEXT] Toki message structure:', {
        toki_id: message.toki_id,
        content: message.content,
        created_at: message.created_at,
        sender_name: message.sender_name,
        sender_id: message.sender_id
      });
      console.log('📨 [APP CONTEXT] Current user ID:', state.currentUser?.id);

      // Update Toki group chats if we're on the messages screen
      if (state.currentUser?.id && message.sender_id !== state.currentUser.id) {
        console.log('🔄 [APP CONTEXT] Updating Toki group chats for new message');

        // FRONTEND WORKAROUND: Increment unread count locally
        const currentChats = state.tokiGroupChats || [];
        const updatedChats = currentChats.map(chat => {
          if (chat.id === message.toki_id) {
            return {
              ...chat,
              unread_count: (chat.unread_count || 0) + 1,
              last_message: message.content,
              last_message_time: message.created_at
            };
          }
          return chat;
        });

        // Update state immediately with incremented unread count
        dispatch({ type: 'SET_TOKI_GROUP_CHATS', payload: updatedChats });

        // Also refresh from API (but this won't have the right unread count until backend is fixed)
        actionsRef.current.getTokiGroupChats();
      }
    });

    // Listen for new notifications
    socketService.onNotificationReceived((notification: any) => {
      console.log('📬 [APP CONTEXT] RECEIVED EVENT: notification-received');
      console.log('📬 [APP CONTEXT] Notification structure:', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        created_at: notification.created_at,
        timestamp: notification.timestamp,
        user_id: notification.user_id,
        userId: notification.userId,
        source: notification.source
      });
      console.log('📬 [APP CONTEXT] Current user ID:', state.currentUser?.id);

      // Check if notification is for current user
      // For system notifications: notification.user_id === currentUser.id
      // For connection requests: notification is sent to recipient's room, so if we received it, it's for us
      const isForCurrentUser = state.currentUser?.id && (
        notification.user_id === state.currentUser.id || // System notifications
        notification.source === 'connection_pending' || // Connection requests (sent to recipient's room)
        notification.source === 'connection_accepted' // Connection accepted (sent to requester's room)
      );

      if (isForCurrentUser) {
        console.log('🔄 [APP CONTEXT] Updating notifications for new notification');

        // Transform backend notification format to frontend format
        // Handle both system notifications and connection requests (from combined route format)
        const transformedNotification = {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          created_at: notification.timestamp || notification.created_at,
          read: notification.read || false,
          tokiId: notification.related_toki_id || notification.tokiId,
          userId: notification.related_user_id || notification.userId,
          source: notification.source || 'system', // Use source from notification if provided
          externalId: notification.externalId || notification.id,
          actionRequired: notification.actionRequired,
        };

        // Add new notification to the beginning of the list
        const currentNotifications = state.notifications || [];
        const updatedNotifications = [transformedNotification, ...currentNotifications];

        // Update state with new notification (reducer will automatically recalculate unread count)
        dispatch({ type: 'SET_NOTIFICATIONS', payload: updatedNotifications });

        console.log('✅ [APP CONTEXT] Notification added to state, unread count will be recalculated');
      } else {
        console.log('⏭️ [APP CONTEXT] Notification not for current user, skipping');
      }
    });

    // Test listener to verify WebSocket is working
    if (socketService.getSocket()) {
      socketService.getSocket()!.on('test-message', (data: any) => {
        console.log('🧪 [APP CONTEXT] TEST EVENT RECEIVED! WebSocket listeners are working:', data);
      });
    }

    // Automatically join all Toki group chat rooms for real-time messaging
    if (state.currentUser?.id) {
      try {
        console.log('🏷️ [APP CONTEXT] Auto-joining Toki group chat rooms...');

        // Get current Toki group chats to join their rooms
        const tokiGroupChats = await actionsRef.current.getTokiGroupChats();

        // Use helper function to join rooms
        await joinTokiGroupChatRooms(tokiGroupChats);

      } catch (error) {
        console.error('❌ [APP CONTEXT] Failed to auto-join Toki rooms:', error);
      }
    }

    console.log('🔌 [APP CONTEXT] Global message listeners set up complete');
    console.log('🔌 [APP CONTEXT] Listeners should now receive message-received and toki-message-received events');
  };

  // Function to re-establish global message listeners (useful for reconnection scenarios)
  const reestablishGlobalListeners = async () => {
    if (state.currentUser?.id && state.isConnected) {
      console.log('🔌 [APP CONTEXT] Re-establishing global message listeners...');
      await setupGlobalMessageListeners();
    }
  };

  return {
    setupGlobalMessageListeners,
    joinTokiGroupChatRooms,
    reestablishGlobalListeners,
  };
}
