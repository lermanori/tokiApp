// Phase-2 hook extraction. Slice from contexts/AppContext.tsx lines 1932-2150.
// Cross-hook calls via actionsRef: joinTokiGroupChatRooms (Socket).

import { Dispatch, MutableRefObject } from 'react';
import { apiService } from '../../../services/api';
import { socketService } from '../../../services/socket';
import type { AppState, AppAction } from '../types';

export function useMessagingActions(
  state: AppState,
  dispatch: Dispatch<AppAction>,
  actionsRef: MutableRefObject<any>,
) {
  const getConversations = async (): Promise<any[]> => {
    try {
      console.log('🔄 [APP CONTEXT] getConversations() called - fetching from API...');
      const response = await apiService.getConversations();
      console.log('📥 [APP CONTEXT] getConversations() API response:', {
        conversationsCount: response.conversations?.length || 0,
        conversations: response.conversations?.map((c: any) => ({
          id: c.id,
          other_user_name: c.other_user_name,
          last_message: c.last_message,
          last_message_time: c.last_message_time,
          unread_count: c.unread_count
        }))
      });

      // Debug: Check if any conversations have unread messages
      const hasUnread = response.conversations?.some((c: any) => c.unread_count > 0);
      console.log('🔍 [APP CONTEXT] Any conversations with unread messages?', hasUnread);

      console.log('✅ [APP CONTEXT] Conversations loaded:', response.conversations.length);
      // Update global state
      dispatch({ type: 'SET_CONVERSATIONS', payload: response.conversations });
      console.log('✅ [APP CONTEXT] getConversations() - state updated with', response.conversations?.length || 0, 'conversations');
      return response.conversations;
    } catch (error) {
      console.error('❌ [APP CONTEXT] getConversations() failed:', error);
      return [];
    }
  };

  const startConversation = async (otherUserId: string): Promise<string | null> => {
    try {
      const response = await apiService.startConversation(otherUserId);
      console.log('✅ Conversation started:', response.conversationId);
      return response.conversationId;
    } catch (error) {
      console.error('❌ Failed to start conversation:', error);
      return null;
    }
  };

  const getConversationMessages = async (conversationId: string): Promise<any[]> => {
    try {
      const response = await apiService.getConversationMessages(conversationId);
      console.log('✅ Conversation messages loaded:', response.messages.length);
      return response.messages;
    } catch (error) {
      console.error('❌ Failed to load conversation messages:', error);
      return [];
    }
  };

  const sendConversationMessage = async (conversationId: string, content: string): Promise<boolean> => {
    try {
      const response = await apiService.sendMessage(conversationId, content);
      console.log('✅ Message sent:', response.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      return false;
    }
  };

  const getTokiMessages = async (tokiId: string): Promise<any[]> => {
    try {
      const response = await apiService.getTokiMessages(tokiId);
      console.log('✅ Toki messages loaded:', response.messages.length);

      // Debug the API response structure
      if (response.messages && response.messages.length > 0) {
        console.log('🔍 API RESPONSE INSPECTION:');
        console.log('📨 Raw API response first message:', JSON.stringify(response.messages[0], null, 2));
        console.log('📨 API response created_at:', {
          value: response.messages[0]?.created_at,
          type: typeof response.messages[0]?.created_at,
          isString: typeof response.messages[0]?.created_at === 'string',
        });
      }

      return response.messages;
    } catch (error) {
      console.error('❌ Failed to load Toki messages:', error);
      return [];
    }
  };

  const sendTokiMessage = async (tokiId: string, content: string): Promise<boolean> => {
    try {
      const response = await apiService.sendTokiMessage(tokiId, content);
      console.log('✅ Toki message sent:', response.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send Toki message:', error);
      return false;
    }
  };

  const deleteMessage = async (messageId: string): Promise<boolean> => {
    try {
      const response = await apiService.deleteMessage(messageId);
      console.log('✅ Message deleted');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete message:', error);
      return false;
    }
  };

  const getTokiGroupChats = async (): Promise<any[]> => {
    try {
      console.log('🔄 [APP CONTEXT] getTokiGroupChats() called - fetching from API...');
      const response = await apiService.getTokiGroupChats();
      console.log('📥 [APP CONTEXT] getTokiGroupChats() API response:', {
        chatsCount: response.chats?.length || 0,
        chats: response.chats?.map((c: any) => ({
          id: c.id,
          title: c.title,
          last_message: c.last_message,
          last_message_time: c.last_message_time,
          unread_count: c.unread_count
        }))
      });

      // Debug: Check if any toki group chats have unread messages
      const hasUnread = response.chats?.some((c: any) => c.unread_count > 0);
      console.log('🔍 [APP CONTEXT] Any toki group chats with unread messages?', hasUnread);

      console.log('✅ [APP CONTEXT] Toki group chats loaded:', response.chats.length);

      // Update global state
      dispatch({ type: 'SET_TOKI_GROUP_CHATS', payload: response.chats });
      console.log('✅ [APP CONTEXT] getTokiGroupChats() - state updated with', response.chats?.length || 0, 'chats');

      // Auto-join new Toki group chat rooms if user is authenticated and connected
      if (state.currentUser?.id && socketService.getConnectionStatus()) {
        console.log('🏷️ [APP CONTEXT] Auto-joining new Toki group chat rooms...');
        await actionsRef.current.joinTokiGroupChatRooms(response.chats);
      }

      return response.chats;
    } catch (error) {
      console.error('❌ [APP CONTEXT] getTokiGroupChats() failed:', error);
      return [];
    }
  };

  // Mark conversation as read
  const markConversationAsRead = async (conversationId: string): Promise<boolean> => {
    try {
      console.log('✅ [APP CONTEXT] Marking conversation as read:', conversationId);

      // Immediately update local state to show unread count as 0
      const currentConversations = state.conversations || [];
      const updatedConversations = currentConversations.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            unread_count: 0
          };
        }
        return conv;
      });

      // Update state immediately for instant UI feedback
      dispatch({ type: 'SET_CONVERSATIONS', payload: updatedConversations });

      // Call backend API to mark as read
      const response = await apiService.post(`/messages/conversations/${conversationId}/read`);
      console.log('✅ [APP CONTEXT] Conversation marked as read on backend:', response);

      return true;
    } catch (error) {
      console.error('❌ [APP CONTEXT] Failed to mark conversation as read:', error);

      // Revert local state change if backend call failed
      console.log('🔄 [APP CONTEXT] Reverting local state change due to backend failure');
      const currentConversations = state.conversations || [];
      dispatch({ type: 'SET_CONVERSATIONS', payload: currentConversations });

      return false;
    }
  };

  // Mark Toki as read
  const markTokiAsRead = async (tokiId: string): Promise<boolean> => {
    try {
      console.log('✅ [APP CONTEXT] Marking Toki as read:', tokiId);

      // Immediately update local state to show unread count as 0
      const currentChats = state.tokiGroupChats || [];
      const updatedChats = currentChats.map(chat => {
        if (chat.id === tokiId) {
          return {
            ...chat,
            unread_count: 0
          };
        }
        return chat;
      });

      // Update state immediately for instant UI feedback
      dispatch({ type: 'SET_TOKI_GROUP_CHATS', payload: updatedChats });

      // Call backend API to mark as read
      const response = await apiService.post(`/messages/tokis/${tokiId}/read`);
      console.log('✅ [APP CONTEXT] Toki marked as read on backend:', response);

      return true;
    } catch (error) {
      console.error('❌ [APP CONTEXT] Failed to mark Toki as read:', error);

      // Revert local state change if backend call failed
      console.log('🔄 [APP CONTEXT] Reverting local state change due to backend failure');
      const currentChats = state.tokiGroupChats || [];
      dispatch({ type: 'SET_TOKI_GROUP_CHATS', payload: currentChats });

      return false;
    }
  };

  return {
    getConversations,
    startConversation,
    getConversationMessages,
    sendConversationMessage,
    getTokiMessages,
    sendTokiMessage,
    deleteMessage,
    getTokiGroupChats,
    markConversationAsRead,
    markTokiAsRead,
  };
}
