// Phase-2 refactor: action handlers extracted into 10 custom hooks under _AppContext/hooks/.
// Phase-1 (prior): types, constants, state, and reducer extracted to _AppContext/.
// Public surface unchanged: AppProvider + useApp.

import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';
import { isRealtimeDisabledForE2E } from '../services/launchArgs';
import { registerAndSyncPushToken, configureForegroundNotificationHandler } from '../utils/notifications';
import { useAnalytics } from '../hooks/useAnalytics';

// -- Slice imports --
// Re-export all types so external callers continue to work unchanged.
export type { Toki, User, Message, SavedToki, NotificationItem, RedirectionState, AnonymousLandingState, AppState, AppAction, AppContextType } from './_AppContext/types';
// Also import types into this module's own scope (re-export doesn't bring them into scope).
import type { AppContextType } from './_AppContext/types';
import { emptyUser, loadStoredData, initialState } from './_AppContext/state';
import { appReducer } from './_AppContext/reducer';

// -- Hook imports (Phase-2) --
import { useConnectionSyncActions } from './_AppContext/hooks/useConnectionSyncActions';
import { useAuthProfileActions } from './_AppContext/hooks/useAuthProfileActions';
import { useRatingsBlockingActions } from './_AppContext/hooks/useRatingsBlockingActions';
import { useMessagingActions } from './_AppContext/hooks/useMessagingActions';
import { useMiscActions } from './_AppContext/hooks/useMiscActions';
import { useTokiCrudActions } from './_AppContext/hooks/useTokiCrudActions';
import { useTokiManagementActions } from './_AppContext/hooks/useTokiManagementActions';
import { useConnectionsActions } from './_AppContext/hooks/useConnectionsActions';
import { useTokiDiscoveryActions } from './_AppContext/hooks/useTokiDiscoveryActions';
import { useSocketActions } from './_AppContext/hooks/useSocketActions';

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { trackEvent } = useAnalytics();

  // Mutable ref to the actions object, populated after all hooks compose it below.
  // Hooks that need to call cross-hook actions (e.g. socket listeners calling
  // getConversations from useMessagingActions) read via actionsRef.current.foo().
  const actionsRef = useRef<any>(null!);

  // Compose action handlers from 10 hooks.
  const connectionSync = useConnectionSyncActions(state, dispatch);
  const authProfile = useAuthProfileActions(state, dispatch, actionsRef);
  const ratingsBlocking = useRatingsBlockingActions(state, dispatch);
  const messaging = useMessagingActions(state, dispatch, actionsRef);
  const misc = useMiscActions(state, dispatch, actionsRef);
  const tokiCrud = useTokiCrudActions(state, dispatch, actionsRef);
  const tokiManagement = useTokiManagementActions(state, dispatch, actionsRef);
  const connections = useConnectionsActions(state, dispatch);
  const tokiDiscovery = useTokiDiscoveryActions(state, dispatch);
  const socket = useSocketActions(state, dispatch, actionsRef);

  // Build the actions object — preserves the exact key order from pre-Phase-2 for
  // consumer compatibility. Same shape as before; no methods added or removed.
  const actions = {
    checkConnection: connectionSync.checkConnection,
    loadTokis: tokiDiscovery.loadTokis,
    loadMyTokis: tokiDiscovery.loadMyTokis,
    loadTokisWithFilters: tokiDiscovery.loadTokisWithFilters,
    loadNearbyTokis: tokiDiscovery.loadNearbyTokis,
    createToki: tokiCrud.createToki,
    updateToki: tokiCrud.updateToki,
    deleteToki: tokiCrud.deleteToki,
    joinToki: tokiCrud.joinToki,
    updateProfile: authProfile.updateProfile,
    sendMessage: misc.sendMessage,
    loadUsers: misc.loadUsers,
    syncData: connectionSync.syncData,
    clearAllData: misc.clearAllData,
    // Connection actions
    getConnections: connections.getConnections,
    getConnectionsForToki: connections.getConnectionsForToki,
    getFriendsAttendingToki: connections.getFriendsAttendingToki,
    getPendingConnections: connections.getPendingConnections,
    sendConnectionRequest: connections.sendConnectionRequest,
    acceptConnectionRequest: connections.acceptConnectionRequest,
    declineConnectionRequest: connections.declineConnectionRequest,
    removeConnection: connections.removeConnection,
    cancelConnectionRequest: connections.cancelConnectionRequest,
    // Rating actions
    getUserRatings: ratingsBlocking.getUserRatings,
    submitRating: ratingsBlocking.submitRating,
    updateRating: ratingsBlocking.updateRating,
    deleteRating: ratingsBlocking.deleteRating,
    getUserRatingStats: ratingsBlocking.getUserRatingStats,
    checkRatingsForToki: ratingsBlocking.checkRatingsForToki,
    // Blocking actions
    loadBlockedUsers: ratingsBlocking.loadBlockedUsers,
    loadBlockedByUsers: ratingsBlocking.loadBlockedByUsers,
    blockUser: ratingsBlocking.blockUser,
    unblockUser: ratingsBlocking.unblockUser,
    checkBlockStatus: ratingsBlocking.checkBlockStatus,
    // User profile actions
    loadCurrentUser: connections.loadCurrentUser,
    // User discovery actions
    searchUsers: connections.searchUsers,
    // Toki join actions
    sendJoinRequest: tokiManagement.sendJoinRequest,
    cancelJoinRequest: tokiManagement.cancelJoinRequest,
    approveJoinRequest: tokiManagement.approveJoinRequest,
    declineJoinRequest: tokiManagement.declineJoinRequest,
    getJoinRequests: tokiManagement.getJoinRequests,
    // Toki management actions
    updateTokiBackend: tokiManagement.updateTokiBackend,
    deleteTokiBackend: tokiManagement.deleteTokiBackend,
    completeToki: tokiManagement.completeToki,
    // Invites
    createInvite: tokiManagement.createInvite,
    listInvites: tokiManagement.listInvites,
    respondToInvite: tokiManagement.respondToInvite,
    respondToInviteViaNotification: tokiManagement.respondToInviteViaNotification,
    // Invite Links
    generateInviteLink: tokiManagement.generateInviteLink,
    regenerateInviteLink: tokiManagement.regenerateInviteLink,
    deactivateInviteLink: tokiManagement.deactivateInviteLink,
    getInviteLinksForToki: tokiManagement.getInviteLinksForToki,
    getInviteLinkInfo: tokiManagement.getInviteLinkInfo,
    joinByInviteCode: tokiManagement.joinByInviteCode,
    // Hide
    hideUser: tokiManagement.hideUser,
    listHiddenUsers: tokiManagement.listHiddenUsers,
    unhideUser: tokiManagement.unhideUser,
    // Remove Participant
    removeParticipant: tokiManagement.removeParticipant,
    // Tokis
    getTokiById: tokiManagement.getTokiById,
    viewToki: tokiManagement.viewToki,
    // Authentication actions
    checkAuthStatus: authProfile.checkAuthStatus,
    logout: authProfile.logout,
    // Messaging actions
    getConversations: messaging.getConversations,
    startConversation: messaging.startConversation,
    getConversationMessages: messaging.getConversationMessages,
    sendConversationMessage: messaging.sendConversationMessage,
    getTokiMessages: messaging.getTokiMessages,
    sendTokiMessage: messaging.sendTokiMessage,
    deleteMessage: messaging.deleteMessage,
    getTokiGroupChats: messaging.getTokiGroupChats,
    // Mark as read actions
    markConversationAsRead: messaging.markConversationAsRead,
    markTokiAsRead: messaging.markTokiAsRead,
    // Message moderation actions
    reportMessage: misc.reportMessage,
    reportToki: misc.reportToki,
    reportUser: misc.reportUser,
    // Socket management actions
    reestablishGlobalListeners: socket.reestablishGlobalListeners,
    testWebSocketListeners: misc.testWebSocketListeners,
    // Helpers used internally via actionsRef (stripped from public actions below)
    joinTokiGroupChatRooms: socket.joinTokiGroupChatRooms,
    setupGlobalMessageListeners: socket.setupGlobalMessageListeners,
    // Saved Tokis actions
    getSavedTokis: misc.getSavedTokis,
    saveToki: misc.saveToki,
    unsaveToki: misc.unsaveToki,
    checkIfSaved: misc.checkIfSaved,
    // User update actions
    updateCurrentUser: misc.updateCurrentUser,
    // Notifications
    loadNotifications: misc.loadNotifications,
    markNotificationRead: misc.markNotificationRead,
    markAllNotificationsRead: misc.markAllNotificationsRead,
    markNotificationsAsRead: misc.markNotificationsAsRead,
    // Redirection actions
    setRedirection: (returnTo: string, params?: Record<string, string>) => {
      dispatch({ type: 'SET_REDIRECTION', payload: { returnTo, returnParams: params } });
    },
    clearRedirection: () => {
      dispatch({ type: 'CLEAR_REDIRECTION' });
    },
    startAnonymousLanding: misc.startAnonymousLanding,
    clearAnonymousLanding: misc.clearAnonymousLanding,
    setPendingIntent: misc.setPendingIntent,
    consumePendingIntent: misc.consumePendingIntent,
    requireAuthForIntent: misc.requireAuthForIntent,
  };

  // Populate actionsRef in the render body so cross-hook calls work synchronously
  // when listeners or timeouts fire. Must be done before any useEffect runs.
  actionsRef.current = actions;

  // Load data from AsyncStorage on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });

        console.log('🔄 Starting loadInitialData...');

        // Initialize API service
        await apiService.initialize();
        console.log('✅ API service initialized');

        const rawStoredSession = await AsyncStorage.getItem('auth_tokens');
        const hadStoredTokens = Boolean(rawStoredSession);

        // Debug: Check if tokens were loaded
        const hasToken = apiService.hasToken();
        console.log('🔍 [APP] Token check after API init:', hasToken);

        // Load stored data as fallback
        const { tokis, currentUser, messages, lastSyncTime } = await loadStoredData();
        console.log('📦 Loaded stored data:', {
          tokisCount: tokis.length,
          currentUserName: currentUser.name,
          hasValidUser: currentUser.id && currentUser.id !== ''
        });

        // Track app open
        trackEvent('app_open', 'app_start', {
          hasValidUser: !!(currentUser && currentUser.id && currentUser.id !== ''),
          had_stored_tokens: hadStoredTokens,
        });

        // Check connection status
        await actionsRef.current.checkConnection();
        console.log('🌐 Connection status checked');

        // If authenticated, load current user and Tokis from backend
        const isAuthenticated = await apiService.isAuthenticated();
        const startupAuthTelemetry = apiService.getLastStartupAuthTelemetry();
        console.log('🔐 Authentication check result:', isAuthenticated);

        if (startupAuthTelemetry?.refreshAttempted) {
          trackEvent('startup_refresh_attempted', 'app_start', {
            had_stored_tokens: startupAuthTelemetry.hadStoredTokens,
          });
        }

        if (startupAuthTelemetry?.refreshSucceeded) {
          trackEvent('startup_refresh_succeeded', 'app_start', {
            had_stored_tokens: startupAuthTelemetry.hadStoredTokens,
          });
        } else if (startupAuthTelemetry?.refreshAttempted && startupAuthTelemetry.refreshFailureReason) {
          trackEvent('startup_refresh_failed', 'app_start', {
            had_stored_tokens: startupAuthTelemetry.hadStoredTokens,
            reason: startupAuthTelemetry.refreshFailureReason,
          });
        }

        if (isAuthenticated) {
          try {
            console.log('👤 Loading authenticated user data...');
            // Use the new loadCurrentUser function
            await actionsRef.current.loadCurrentUser();

            // Get the current user ID from the updated state
            const currentUserId = state.currentUser?.id;
            console.log('👤 Current user ID:', currentUserId);

            // Note: Tokis are loaded by individual screens (Explore/Discover use loadNearbyTokis)
            // This prevents unnecessary /tokis API calls when screens will use /tokis/nearby

            if (!isRealtimeDisabledForE2E()) {
              // Connect to WebSocket
              await socketService.connect();
              if (currentUser.id) {
                await socketService.joinUser(currentUser.id);

                // Note: Global message listeners will be set up after actions are defined
              }
            }

            // Configure foreground notifications to show alert banners while app is open
            try { configureForegroundNotificationHandler(); } catch { }
          } catch (error) {
            console.error('❌ Failed to load authenticated user data:', error);
            // DON'T clear tokens here — the error might be transient (network/timeout).
            // The token refresh logic inside makeRequest() already handles clearing
            // tokens when the refresh token is truly expired (401 from /auth/refresh).
            // Clearing here with apiService.logout() was wiping valid refresh tokens
            // and forcing users to re-login daily.
            console.log('🔄 Falling back to stored data (keeping tokens for retry)');
            dispatch({ type: 'SET_TOKIS', payload: tokis });
            dispatch({ type: 'UPDATE_CURRENT_USER', payload: currentUser });
            dispatch({ type: 'SET_MESSAGES', payload: messages });
            dispatch({ type: 'SET_LAST_SYNC_TIME', payload: lastSyncTime });
          }
        } else {
          // Use stored data if not authenticated
          console.log('📱 Using stored data (not authenticated)');
          dispatch({ type: 'SET_TOKIS', payload: tokis });
          // Keep offline content if desired, but clear identity so auth guards can
          // reliably send the user back to login when the session is gone.
          dispatch({ type: 'UPDATE_CURRENT_USER', payload: emptyUser });
          dispatch({ type: 'SET_MESSAGES', payload: messages });
          dispatch({ type: 'SET_LAST_SYNC_TIME', payload: lastSyncTime });
          console.log(`📱 Loaded ${tokis.length} Tokis from AsyncStorage (offline mode)`);
        }

        dispatch({ type: 'SET_LOADING', payload: false });
      } catch (error) {
        console.error('❌ Failed to load initial data:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadInitialData();
  }, []);

  // Register and send push token once connected and user is available
  useEffect(() => {
    if (state.isConnected && state.currentUser?.id) {
      registerAndSyncPushToken().catch((e) => {
        console.warn('❌ [PUSH] Push registration failed:', e);
      });
    }
  }, [state.isConnected, state.currentUser?.id]);

  // Listen for incoming push notifications
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!state.isConnected || !state.currentUser?.id) return;

    console.log('🔔 [PUSH] Setting up notification listeners...');

    // Listener for when notification is received (app is open/foreground)
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 [PUSH] Notification received:', {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
      });

      // Refresh notifications list to show new notification in UI
      actionsRef.current.loadNotifications().catch((err: any) => console.warn('Failed to refresh notifications:', err));
    });

    // Listener for when user taps on notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, any> | undefined;
      console.log('👆 [PUSH] Notification tapped:', data);

      // Track push opened
      // Extract campaign_id from the notification data if it exists
      trackEvent('push_opened', 'notification', {
        campaign_id: data?.campaign_id || data?.campaignId || undefined,
        notification_type: data?.type || undefined,
        toki_id: data?.tokiId || undefined
      });

      // Navigate to chat screen if this is a chat message notification
      if (data?.type === 'chat_message') {
        try {
          if (data.isGroup) {
            router.push({
              pathname: '/chat',
              params: {
                tokiId: String(data.tokiId || ''),
                isGroup: 'true',
                otherUserName: String(data.tokiTitle || 'Group Chat'),
              },
            });
          } else {
            router.push({
              pathname: '/chat',
              params: {
                conversationId: String(data.conversationId || ''),
                otherUserId: String(data.senderId || ''),
                otherUserName: String(data.senderName || 'Chat'),
                isGroup: 'false',
              },
            });
          }
          console.log('🗺️ [PUSH] Navigated to chat screen from notification tap');
        } catch (navError) {
          console.warn('⚠️ [PUSH] Failed to navigate to chat:', navError);
        }
      }

      // Refresh notifications when user taps
      actionsRef.current.loadNotifications().catch((err: any) => console.warn('Failed to refresh notifications:', err));
    });

    return () => {
      console.log('🧹 [PUSH] Cleaning up notification listeners');
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [state.isConnected, state.currentUser?.id]);

  // Check connection and sync on mount
  useEffect(() => {
    const initializeApp = async () => {
      await actionsRef.current.checkConnection();
      await actionsRef.current.syncData();
    };

    initializeApp();

    // Sync data every 5 minutes (just updates timestamp)
    const syncInterval = setInterval(() => actionsRef.current.syncData(), 300000);

    // Check authentication status every 10 minutes
    const authInterval = setInterval(async () => {
      if (state.isConnected) {
        await actionsRef.current.checkAuthStatus();
      }
    }, 600000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(authInterval);
    };
  }, []); // Remove state.isConnected dependency to prevent infinite loop

  // Set up global socket listeners when user is authenticated and actions are available
  useEffect(() => {
    if (state.currentUser?.id && state.isConnected) {
      // Add a small delay to ensure WebSocket state is fully synchronized
      const setupListenersWithDelay = async () => {
        // Wait a bit for WebSocket state to stabilize
        await new Promise(resolve => setTimeout(resolve, 100));

        const socketStatus = socketService.getConnectionStatus();

        if (socketStatus) {
          console.log('🔌 [APP CONTEXT] Setting up global message listeners...');
          await actionsRef.current.setupGlobalMessageListeners();
        }
      };

      setupListenersWithDelay();

      // Clean up listeners when component unmounts or user changes
      return () => {
        socketService.offMessageReceived();
        socketService.offTokiMessageReceived();
      };
    }
  }, [state.currentUser?.id]); // Remove state.isConnected dependency

  // Keep notifications hydrated on auth/connection changes
  useEffect(() => {
    if (state.isConnected && state.currentUser?.id) {
      actionsRef.current.loadNotifications();
    }
  }, [state.currentUser?.id]); // Remove state.isConnected dependency

  // Load initial data once when user is authenticated
  useEffect(() => {
    const loadInitialAppData = async () => {
      // Only load if user is authenticated (has tokens) and connected
      // Don't rely solely on currentUser.id as it might exist from stored data without valid tokens
      const hasToken = apiService.hasToken();
      if (state.isConnected && state.currentUser?.id && hasToken) {
        console.log('📦 Loading initial app data (notifications, saved tokis, connections)...');
        try {
          await Promise.all([
            actionsRef.current.loadNotifications(),
            actionsRef.current.getSavedTokis(),
            actionsRef.current.getConnections(),
            actionsRef.current.getPendingConnections(),
          ]);
          console.log('✅ Initial app data loaded');
        } catch (error) {
          console.error('❌ Failed to load initial app data:', error);
        }
      } else if (state.currentUser?.id && !hasToken) {
        console.log('⚠️ User data exists but no tokens - skipping authenticated API calls');
      }
    };

    // Load when user becomes available AND has tokens (loading guards will prevent duplicate calls)
    const hasToken = apiService.hasToken();
    if (state.currentUser?.id && state.isConnected && hasToken) {
      loadInitialAppData();
    }
  }, [state.currentUser?.id, state.isConnected]);

  // The AppContextType type expects setupGlobalMessageListeners is NOT in actions
  // (it's an internal helper). Strip joinTokiGroupChatRooms which we added for hook
  // wiring but is not part of the public AppContextType actions interface.
  const {
    joinTokiGroupChatRooms: _internalJoinHelper,
    setupGlobalMessageListeners: _internalSetupListeners,
    ...publicActions
  } = actions;

  return (
    <AppContext.Provider value={{ state, dispatch, actions: publicActions as any }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
