// Phase-2 hook extraction. Slice from contexts/AppContext.tsx lines 1472-1525, 2152-2196, 2214-2341, 2346-2449.
// Bundles: sendMessage, loadUsers, clearAllData, moderation (3), testWebSocketListeners,
// saved tokis (4), updateCurrentUser, anonymous landing (5), notifications (4).
// Owns local state: isLoadingSavedTokis, isLoadingNotifications.
// Cross-hook calls via actionsRef: syncData (ConnectionSync).

import { useState, Dispatch, MutableRefObject } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { apiService } from '../../../services/api';
import { socketService } from '../../../services/socket';
import { getBackendUrl } from '../../../services/config';
import { buildIntentLoginUrl, normalizeAnonymousRoute, ProtectedIntent } from '../../../utils/anonymousLanding';
import type { AppState, AppAction, Message, SavedToki, User, NotificationItem } from '../types';
import { STORAGE_KEYS, storage } from '../constants';
import { emptyUser } from '../state';

export function useMiscActions(
  state: AppState,
  dispatch: Dispatch<AppAction>,
  actionsRef: MutableRefObject<any>,
) {
  const [isLoadingSavedTokis, setIsLoadingSavedTokis] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const sendMessage = async (message: string, tokiId?: string): Promise<boolean> => {
    try {
      const messageData: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: message,
        sender: state.currentUser.name,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOwn: true,
        tokiId,
        createdAt: new Date().toISOString(),
      };

      dispatch({ type: 'ADD_MESSAGE', payload: messageData });

      // Update sync time
      setTimeout(() => actionsRef.current.syncData(), 100);

      console.log('✅ Message sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      return false;
    }
  };

  const loadUsers = async () => {
    // Frontend-only mode - no external users to load
    console.log('📱 Frontend-only mode - no external users');
  };

  const clearAllData = async () => {
    // Clear all storage keys
    for (const key of Object.values(STORAGE_KEYS)) {
      await storage.remove(key);
    }

    // Clear auth tokens specifically
    await AsyncStorage.removeItem('auth_tokens');

    // Reset to initial state
    dispatch({ type: 'SET_TOKIS', payload: [] });
    dispatch({ type: 'SET_MESSAGES', payload: [] });
    dispatch({ type: 'UPDATE_CURRENT_USER', payload: emptyUser });
    dispatch({ type: 'SET_LAST_SYNC_TIME', payload: null });
    dispatch({ type: 'SET_USER_RATINGS', payload: { userId: '', ratings: [], stats: { averageRating: 0, totalRatings: 0, totalReviews: 0 } } });
    dispatch({ type: 'SET_BLOCKED_USERS', payload: [] });
    dispatch({ type: 'SET_BLOCKED_BY_USERS', payload: [] });
    dispatch({ type: 'SET_SAVED_TOKIS', payload: [] });
    dispatch({ type: 'CLEAR_REDIRECTION' });
    dispatch({ type: 'CLEAR_ANONYMOUS_LANDING' });

    console.log('🗑️ All data cleared including auth tokens');
  };

  const reportMessage = async (messageId: string, reason: string): Promise<boolean> => {
    try {
      console.log('🚨 [APP CONTEXT] Reporting message:', messageId, 'for reason:', reason);

      // Call backend API to report message
      const response = await apiService.post(`/messages/${messageId}/report`, { reason });
      console.log('✅ [APP CONTEXT] Message reported successfully:', response);

      return true;
    } catch (error) {
      console.error('❌ [APP CONTEXT] Failed to report message:', error);
      return false;
    }
  };

  const reportToki = async (tokiId: string, reason: string): Promise<boolean> => {
    try {
      console.log('🚨 [APP CONTEXT] Reporting Toki:', tokiId, 'for reason:', reason);

      // Call backend API to report Toki
      await apiService.reportToki(tokiId, reason);
      console.log('✅ [APP CONTEXT] Toki reported successfully');

      return true;
    } catch (error) {
      console.error('❌ [APP CONTEXT] Failed to report Toki:', error);
      return false;
    }
  };

  const reportUser = async (userId: string, reason: string): Promise<boolean> => {
    try {
      console.log('🚨 [APP CONTEXT] Reporting user:', userId, 'for reason:', reason);

      // Call backend API to report user
      await apiService.reportUser(userId, reason);
      console.log('✅ [APP CONTEXT] User reported successfully');

      return true;
    } catch (error) {
      console.error('❌ [APP CONTEXT] Failed to report user:', error);
      return false;
    }
  };

  // Test function to verify WebSocket listeners are working
  const testWebSocketListeners = () => {
    console.log('🧪 [APP CONTEXT] Testing WebSocket listeners...');
    console.log('🧪 [APP CONTEXT] Socket service status:', socketService.getConnectionStatus());
    console.log('🧪 [APP CONTEXT] Socket instance:', socketService.getSocket() ? 'exists' : 'null');
    console.log('🧪 [APP CONTEXT] Socket connected:', socketService.getSocket()?.connected);
    console.log('🧪 [APP CONTEXT] Current rooms:', socketService.getCurrentRooms());

    // Try to emit a test event to see if listeners are working
    const socket = socketService.getSocket();
    if (socket && socket.connected) {
      console.log('🧪 [APP CONTEXT] Emitting test event to verify listeners...');
      // This will trigger our listeners if they're working
      socket.emit('test-message', { test: true, timestamp: Date.now() });
    }
  };

  // Saved Tokis actions
  const getSavedTokis = async (): Promise<SavedToki[]> => {
    try {
      // Prevent duplicate API calls
      if (isLoadingSavedTokis) {
        console.log('⏳ Saved Tokis already loading, returning cached data');
        return state.savedTokis;
      }

      setIsLoadingSavedTokis(true);
      const savedTokis = await apiService.getSavedTokis();
      dispatch({ type: 'SET_SAVED_TOKIS', payload: savedTokis });
      return savedTokis;
    } catch (error) {
      console.error('❌ Failed to load saved Tokis:', error);
      return state.savedTokis;
    } finally {
      setIsLoadingSavedTokis(false);
    }
  };

  const saveToki = async (tokiId: string): Promise<boolean> => {
    try {
      const success = await apiService.saveToki(tokiId);
      if (success) {
        try {
          await apiService.trackEngagement(tokiId, 'save');
        } catch (trackingError) {
          console.warn('⚠️ Failed to track save engagement:', trackingError);
        }
        // Refresh saved Tokis
        dispatch({ type: 'REFRESH_SAVED_TOKIS' });
      }
      return success;
    } catch (error) {
      console.error('❌ Failed to save Toki:', error);
      return false;
    }
  };

  const unsaveToki = async (tokiId: string): Promise<boolean> => {
    try {
      const success = await apiService.unsaveToki(tokiId);
      if (success) {
        // Remove from saved Tokis
        dispatch({ type: 'REMOVE_SAVED_TOKI', payload: tokiId });
      }
      return success;
    } catch (error) {
      console.error('❌ Failed to unsave Toki:', error);
      return false;
    }
  };

  const checkIfSaved = async (tokiId: string): Promise<boolean> => {
    try {
      return await apiService.checkIfSaved(tokiId);
    } catch (error) {
      console.error('❌ Failed to check if Toki is saved:', error);
      return false;
    }
  };

  const updateCurrentUser = async (updates: Partial<User>): Promise<void> => {
    try {
      dispatch({
        type: 'UPDATE_CURRENT_USER',
        payload: updates
      });
      console.log('✅ Current user updated successfully:', updates);
    } catch (error) {
      console.error('❌ Failed to update current user:', error);
    }
  };

  const startAnonymousLanding = (landingRoute: string, landingParams?: Record<string, string>) => {
    dispatch({
      type: 'START_ANONYMOUS_LANDING',
      payload: {
        landingRoute,
        landingParams,
      }
    });
  };

  const clearAnonymousLanding = () => {
    dispatch({ type: 'CLEAR_ANONYMOUS_LANDING' });
  };

  const setPendingIntent = (intent: ProtectedIntent) => {
    dispatch({ type: 'SET_PENDING_INTENT', payload: intent });
  };

  const consumePendingIntent = () => {
    dispatch({ type: 'CLEAR_PENDING_INTENT' });
  };

  const requireAuthForIntent = (intent: ProtectedIntent): boolean => {
    const hasAuthenticatedSession = Boolean(state.currentUser?.id) || apiService.hasToken();
    if (hasAuthenticatedSession) {
      return true;
    }

    const normalizedIntent: ProtectedIntent = {
      route: normalizeAnonymousRoute(intent.route),
      params: intent.params,
    };

    dispatch({ type: 'SET_PENDING_INTENT', payload: normalizedIntent });
    router.replace(buildIntentLoginUrl(normalizedIntent) as any);
    return false;
  };

  // =========================
  // Notifications (Unread)
  // =========================
  const loadNotifications = async (): Promise<NotificationItem[]> => {
    try {
      // Prevent duplicate API calls
      if (isLoadingNotifications) {
        console.log('⏳ Notifications already loading, returning cached data');
        return state.notifications;
      }

      setIsLoadingNotifications(true);

      // Use unified backend endpoint
      const response = await fetch(`${getBackendUrl()}/api/notifications/combined`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await apiService.getAccessToken()}`,
        },
      });
      if (!response.ok) {
        dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
        return [];
      }
      const json = await response.json();
      const listFromServer: NotificationItem[] = (json?.data?.notifications || json?.notifications || []).map((n: any) => ({
        id: String(n.id),
        type: n.type,
        title: n.title,
        message: n.message,
        created_at: n.timestamp || n.created_at,
        timestamp: n.timestamp || n.created_at,
        read: !!n.read,
        isRead: !!n.read,
        // unified identifiers
        source: n.source,
        externalId: n.externalId,
        actionRequired: n.actionRequired,
        tokiId: n.tokiId ? String(n.tokiId) : undefined,
        requestId: n.requestId ? String(n.requestId) : undefined,
        userId: n.userId ? String(n.userId) : undefined,
        tokiTitle: n.tokiTitle,
      }));
      dispatch({ type: 'SET_NOTIFICATIONS', payload: listFromServer });
      return listFromServer;
    } catch (error) {
      console.error('❌ Failed to load notifications:', error);
      dispatch({ type: 'SET_NOTIFICATIONS', payload: [] });
      return [];
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const markNotificationRead = async (id: string, source?: string, externalId?: string): Promise<void> => {
    try {
      // Use timestamp marker system - mark all notifications as read
      await fetch(`${getBackendUrl()}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await apiService.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
      });
      // Refresh notifications to get updated read status
      await loadNotifications();
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
  };

  const markAllNotificationsRead = async (): Promise<void> => {
    try {
      // Use timestamp marker system
      await fetch(`${getBackendUrl()}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await apiService.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
      });
      // Refresh notifications to get updated read status
      await loadNotifications();
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
    }
  };

  const markNotificationsAsRead = async (): Promise<void> => {
    try {
      console.log('✅ [APP CONTEXT] Marking notifications as read via timestamp marker');

      // Call backend to set timestamp marker
      await fetch(`${getBackendUrl()}/api/notifications/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await apiService.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
      });

      // Refresh notifications to get updated read status
      await loadNotifications();
    } catch (error) {
      console.error('❌ Failed to mark notifications as read:', error);
    }
  };

  return {
    sendMessage,
    loadUsers,
    clearAllData,
    reportMessage,
    reportToki,
    reportUser,
    testWebSocketListeners,
    getSavedTokis,
    saveToki,
    unsaveToki,
    checkIfSaved,
    updateCurrentUser,
    startAnonymousLanding,
    clearAnonymousLanding,
    setPendingIntent,
    consumePendingIntent,
    requireAuthForIntent,
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    markNotificationsAsRead,
  };
}
