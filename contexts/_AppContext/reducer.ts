// Auto-generated slice — do not edit manually.
// Source: contexts/AppContext.tsx lines 349-603
// Phase-1 pure extraction: appReducer pure function.

import { AppState, AppAction } from './types';
import { STORAGE_KEYS, storage } from './constants';
import { normalizeAnonymousRoute } from '../../utils/anonymousLanding';

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };
    case 'SET_REDIRECTION':
      return {
        ...state,
        redirection: {
          returnTo: action.payload.returnTo,
          returnParams: action.payload.returnParams || null,
          isRedirecting: true
        }
      };
    case 'CLEAR_REDIRECTION':
      return {
        ...state,
        redirection: {
          returnTo: null,
          returnParams: null,
          isRedirecting: false
        }
      };
    case 'START_ANONYMOUS_LANDING':
      return {
        ...state,
        anonymousLanding: {
          ...state.anonymousLanding,
          isAnonymousLanding: true,
          landingRoute: normalizeAnonymousRoute(action.payload.landingRoute),
          landingParams: action.payload.landingParams || null,
        }
      };
    case 'CLEAR_ANONYMOUS_LANDING':
      return {
        ...state,
        anonymousLanding: {
          isAnonymousLanding: false,
          landingRoute: null,
          landingParams: null,
          pendingIntent: null,
        }
      };
    case 'SET_PENDING_INTENT':
      return {
        ...state,
        anonymousLanding: {
          ...state.anonymousLanding,
          pendingIntent: action.payload,
        }
      };
    case 'CLEAR_PENDING_INTENT':
      return {
        ...state,
        anonymousLanding: {
          ...state.anonymousLanding,
          pendingIntent: null,
        }
      };
    case 'SET_TOKIS':
      // Store in AsyncStorage (async operation)
      storage.set(STORAGE_KEYS.TOKIS, action.payload);
      return { ...state, tokis: action.payload, mapTokis: action.payload };
    case 'SET_MAP_TOKIS':
      return { ...state, mapTokis: action.payload };
    case 'ADD_TOKI':
      const newTokis = [action.payload, ...state.tokis];
      storage.set(STORAGE_KEYS.TOKIS, newTokis);

      // Update user stats
      const updatedUserAfterAdd = {
        ...state.currentUser,
        tokisCreated: state.currentUser.tokisCreated + 1,
      };
      storage.set(STORAGE_KEYS.CURRENT_USER, updatedUserAfterAdd);

      return {
        ...state,
        tokis: newTokis,
        mapTokis: newTokis,
        currentUser: updatedUserAfterAdd,
      };
    case 'UPDATE_TOKI':
      const updatedTokis = state.tokis.map(toki =>
        toki.id === action.payload.id
          ? { ...toki, ...action.payload.updates }
          : toki
      );
      storage.set(STORAGE_KEYS.TOKIS, updatedTokis);

      // Update user stats if join status changed
      let updatedUserAfterUpdate = state.currentUser;
      const updatedToki = updatedTokis.find(t => t.id === action.payload.id);
      if (updatedToki && !updatedToki.isHostedByUser && action.payload.updates.joinStatus === 'approved') {
        updatedUserAfterUpdate = {
          ...state.currentUser,
          tokisJoined: state.currentUser.tokisJoined + 1,
        };
        storage.set(STORAGE_KEYS.CURRENT_USER, updatedUserAfterUpdate);
      }

      return {
        ...state,
        tokis: updatedTokis,
        mapTokis: updatedTokis,
        currentUser: updatedUserAfterUpdate,
      };
    case 'DELETE_TOKI':
      const filteredTokis = state.tokis.filter(toki => toki.id !== action.payload);
      storage.set(STORAGE_KEYS.TOKIS, filteredTokis);

      // Update user stats
      const deletedToki = state.tokis.find(t => t.id === action.payload);
      let updatedUserAfterDelete = state.currentUser;
      if (deletedToki?.isHostedByUser) {
        updatedUserAfterDelete = {
          ...state.currentUser,
          tokisCreated: Math.max(0, state.currentUser.tokisCreated - 1),
        };
        storage.set(STORAGE_KEYS.CURRENT_USER, updatedUserAfterDelete);
      }

      return {
        ...state,
        tokis: filteredTokis,
        mapTokis: filteredTokis,
        currentUser: updatedUserAfterDelete,
      };
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.id
            ? { ...user, ...action.payload.updates }
            : user
        ),
      };
    case 'SET_MESSAGES':
      storage.set(STORAGE_KEYS.MESSAGES, action.payload);
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      const newMessages = [...state.messages, action.payload];
      storage.set(STORAGE_KEYS.MESSAGES, newMessages);
      return { ...state, messages: newMessages };
    case 'UPDATE_CURRENT_USER':
      const updatedCurrentUser = { ...state.currentUser, ...action.payload };
      storage.set(STORAGE_KEYS.CURRENT_USER, updatedCurrentUser);
      return { ...state, currentUser: updatedCurrentUser };
    case 'SET_LAST_SYNC_TIME':
      storage.set(STORAGE_KEYS.LAST_SYNC, action.payload);
      return { ...state, lastSyncTime: action.payload };
    case 'SET_USER_RATINGS':
      return {
        ...state,
        userRatings: {
          ...state.userRatings,
          [action.payload.userId]: {
            ratings: action.payload.ratings,
            stats: action.payload.stats,
          },
        },
      };
    case 'SET_BLOCKED_USERS':
      return { ...state, blockedUsers: action.payload };
    case 'SET_BLOCKED_BY_USERS':
      return { ...state, blockedByUsers: action.payload };
    case 'SET_CONVERSATIONS':
      console.log('🔄 [REDUCER] SET_CONVERSATIONS - Updating state with', action.payload?.length || 0, 'conversations');
      console.log('📱 [REDUCER] Conversations data:', action.payload?.map((c: any) => ({
        id: c.id,
        other_user_name: c.other_user_name,
        last_message: c.last_message,
        last_message_time: c.last_message_time
      })));
      return { ...state, conversations: action.payload };
    case 'SET_TOKI_GROUP_CHATS':
      console.log('🔄 [REDUCER] SET_TOKI_GROUP_CHATS - Updating state with', action.payload?.length || 0, 'toki group chats');
      console.log('🏷️ [REDUCER] Toki group chats data:', action.payload?.map((c: any) => ({
        id: c.id,
        title: c.title,
        last_message: c.last_message,
        last_message_time: c.last_message_time
      })));
      return { ...state, tokiGroupChats: action.payload };
    case 'SET_SAVED_TOKIS':
      return { ...state, savedTokis: action.payload };
    case 'REMOVE_SAVED_TOKI':
      return { ...state, savedTokis: state.savedTokis.filter(toki => toki.id !== action.payload) };
    case 'REFRESH_SAVED_TOKIS':
      return { ...state, savedTokis: [] }; // Will be refreshed by calling getSavedTokis again
    case 'SET_NOTIFICATIONS': {
      const unread = (action.payload || []).filter(n => !(n.isRead || n.read)).length;
      return { ...state, notifications: action.payload, unreadNotificationsCount: unread };
    }
    case 'SET_UNREAD_NOTIFICATIONS_COUNT':
      return { ...state, unreadNotificationsCount: Math.max(0, action.payload || 0) };
    case 'MARK_NOTIFICATION_READ': {
      const updated = state.notifications.map(n => n.id === action.payload.id ? { ...n, isRead: true, read: true } : n);
      const unread = updated.filter(n => !(n.isRead || n.read)).length;
      return { ...state, notifications: updated, unreadNotificationsCount: unread };
    }
    case 'MARK_ALL_NOTIFICATIONS_READ': {
      const updated = state.notifications.map(n => ({ ...n, isRead: true, read: true }));
      return { ...state, notifications: updated, unreadNotificationsCount: 0 };
    }
    case 'SET_TOTAL_NEARBY_COUNT':
      return { ...state, totalNearbyCount: action.payload };
    case 'SET_CONNECTIONS': {
      const ids = action.payload.map((c: any) => c.user?.id || c.id).filter(Boolean);
      return {
        ...state,
        connections: action.payload,
        userConnectionsIds: ids
      };
    }
    case 'SET_PENDING_CONNECTIONS':
      return { ...state, pendingConnections: action.payload };
    case 'ADD_CONNECTION': {
      const newConnections = [...state.connections, action.payload];
      const ids = newConnections.map((c: any) => c.user?.id || c.id).filter(Boolean);
      return {
        ...state,
        connections: newConnections,
        userConnectionsIds: ids
      };
    }
    case 'REMOVE_CONNECTION': {
      const filtered = state.connections.filter((c: any) =>
        (c.user?.id || c.id) !== action.payload
      );
      const ids = filtered.map((c: any) => c.user?.id || c.id).filter(Boolean);
      return {
        ...state,
        connections: filtered,
        userConnectionsIds: ids
      };
    }
    case 'UPDATE_CONNECTION': {
      const updated = state.connections.map((c: any) =>
        (c.user?.id || c.id) === action.payload.id
          ? { ...c, ...action.payload.updates }
          : c
      );
      return { ...state, connections: updated };
    }
    default:
      return state;
  }
}

