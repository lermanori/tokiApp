import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, Toki as ApiToki, User as ApiUser, UserStats, UserRating, UserRatingStats, BlockedUser, BlockStatus } from '../services/api';
import { socketService } from '../services/socket';
import { getBackendUrl } from '../services/config';

interface Toki {
  id: string;
  title: string;
  description: string;
  location: string;
  time: string;
  attendees: number;
  currentAttendees?: number;
  maxAttendees: number;
  tags: string[];
  host: {
    id: string;
    name: string;
    avatar: string;
  };
  image: string;
  distance: string;
  isHostedByUser?: boolean;
  joinStatus?: 'not_joined' | 'pending' | 'approved' | 'joined';
  visibility: 'public' | 'connections' | 'friends';
  category: string;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  scheduledTime?: string; // Add scheduled time for better display
}

interface User {
  id: string;
  name: string;
  email?: string;
  bio: string;
  location: string;
  latitude?: number;
  longitude?: number;
  avatar: string;
  verified: boolean;
  socialLinks: {
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
    facebook?: string;
  };
  memberSince: string;
  tokisCreated: number;
  tokisJoined: number;
  connections: number;
  rating: number;
}

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  isOwn: boolean;
  tokiId?: string;
  createdAt: string;
}

interface SavedToki {
  id: string;
  title: string;
  description: string;
  location: string;
  timeSlot: string;
  scheduledTime: string;
  currentAttendees: number;
  maxAttendees: number;
  category: string;
  imageUrl: string;
  savedAt: string;
  host: {
    id: string;
    name: string;
    avatar: string;
  };
  distance?: {
    km: number;
    miles: number;
  };
  tags: string[];
  joinStatus?: string;
}

// Basic notification shape used by context
interface NotificationItem {
  id: string;
  type?: string;
  title?: string;
  message?: string;
  created_at?: string;
  timestamp?: string;
  read?: boolean;
  isRead?: boolean;
  source?: string;
  externalId?: string;
  actionRequired?: boolean;
  tokiId?: string;
  requestId?: string;
  userId?: string;
  tokiTitle?: string;
}

interface RedirectionState {
  returnTo: string | null;
  returnParams: Record<string, string> | null;
  isRedirecting: boolean;
}

interface AppState {
  tokis: Toki[];
  users: User[];
  messages: Message[];
  currentUser: User;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastSyncTime: string | null;
  userRatings: { [userId: string]: { ratings: UserRating[]; stats: UserRatingStats } };
  blockedUsers: BlockedUser[];
  redirection: RedirectionState;
  blockedByUsers: BlockedUser[];
  conversations: any[];
  tokiGroupChats: any[];
  savedTokis: SavedToki[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_REDIRECTION'; payload: { returnTo: string; returnParams?: Record<string, string> } }
  | { type: 'CLEAR_REDIRECTION' }
  | { type: 'SET_TOKIS'; payload: Toki[] }
  | { type: 'ADD_TOKI'; payload: Toki }
  | { type: 'UPDATE_TOKI'; payload: { id: string; updates: Partial<Toki> } }
  | { type: 'DELETE_TOKI'; payload: string }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'UPDATE_USER'; payload: { id: string; updates: Partial<User> } }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_CURRENT_USER'; payload: Partial<User> }
  | { type: 'SET_LAST_SYNC_TIME'; payload: string | null }
  | { type: 'SET_USER_RATINGS'; payload: { userId: string; ratings: UserRating[]; stats: UserRatingStats } }
  | { type: 'SET_BLOCKED_USERS'; payload: BlockedUser[] }
  | { type: 'SET_BLOCKED_BY_USERS'; payload: BlockedUser[] }
  | { type: 'SET_CONVERSATIONS'; payload: any[] }
  | { type: 'SET_TOKI_GROUP_CHATS'; payload: any[] }
  | { type: 'SET_SAVED_TOKIS'; payload: SavedToki[] }
  | { type: 'REMOVE_SAVED_TOKI'; payload: string }
  | { type: 'REFRESH_SAVED_TOKIS' }
  | { type: 'SET_NOTIFICATIONS'; payload: NotificationItem[] }
  | { type: 'SET_UNREAD_NOTIFICATIONS_COUNT'; payload: number }
  | { type: 'MARK_NOTIFICATION_READ'; payload: { id: string } }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' };

// Storage keys
const STORAGE_KEYS = {
  TOKIS: 'toki_app_tokis',
  CURRENT_USER: 'toki_app_current_user',
  MESSAGES: 'toki_app_messages',
  LAST_SYNC: 'toki_app_last_sync',
};

// Local storage helpers
const storage = {
  get: async (key: string) => {
    try {
      const item = await AsyncStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from storage:', error);
      return null;
    }
  },
  set: async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to storage:', error);
    }
  },
  remove: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  },
};

const initialUser: User = {
  id: '1',
  name: 'Maya Cohen',
  bio: 'Love exploring Tel Aviv\'s hidden gems ✨ Always up for coffee and good vibes',
  location: 'Tel Aviv, Israel',
  avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
  verified: true,
  socialLinks: {
    instagram: '@maya_tlv',
    linkedin: 'maya-cohen-tlv',
  },
  memberSince: 'March 2023',
  tokisCreated: 0,
  tokisJoined: 0,
  connections: 4,
  rating: 4.8,
};

const emptyUser: User = {
  id: '',
  name: '',
  email: '',
  bio: '',
  location: '',
  avatar: '',
  verified: false,
  socialLinks: {},
  memberSince: '',
  tokisCreated: 0,
  tokisJoined: 0,
  connections: 0,
  rating: 0,
};

// Load initial data from storage
const loadStoredData = async () => {
  const storedTokis = await storage.get(STORAGE_KEYS.TOKIS) || [];
  const storedUser = await storage.get(STORAGE_KEYS.CURRENT_USER);
  const storedMessages = await storage.get(STORAGE_KEYS.MESSAGES) || [];
  const lastSyncTime = await storage.get(STORAGE_KEYS.LAST_SYNC);

  // Only use stored user if it exists and has a real ID (not empty)
  const currentUser = storedUser && storedUser.id && storedUser.id !== '' ? storedUser : emptyUser;

  // Calculate user stats from stored data
  const userTokis = storedTokis.filter((toki: Toki) => toki.isHostedByUser);
  const joinedTokis = storedTokis.filter((toki: Toki) => 
    !toki.isHostedByUser && (toki.joinStatus === 'joined' || toki.joinStatus === 'approved')
  );

  const updatedUser = {
    ...currentUser,
    tokisCreated: userTokis.length,
    tokisJoined: joinedTokis.length,
  };

  return {
    tokis: storedTokis,
    currentUser: updatedUser,
    messages: storedMessages,
    lastSyncTime,
  };
};

// Initial state with empty data - will be loaded asynchronously
const initialState: AppState = {
  tokis: [],
  users: [],
  messages: [],
  currentUser: emptyUser,
  loading: false,
  error: null,
  isConnected: true,
  lastSyncTime: null,
  userRatings: {},
  blockedUsers: [],
  redirection: {
    returnTo: null,
    returnParams: null,
    isRedirecting: false
  },
  blockedByUsers: [],
  conversations: [],
  tokiGroupChats: [],
  savedTokis: [],
  notifications: [],
  unreadNotificationsCount: 0,
};

function appReducer(state: AppState, action: AppAction): AppState {
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
    case 'SET_TOKIS':
      // Store in AsyncStorage (async operation)
      storage.set(STORAGE_KEYS.TOKIS, action.payload);
      return { ...state, tokis: action.payload };
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
      if (updatedToki && !updatedToki.isHostedByUser && action.payload.updates.joinStatus === 'joined') {
        updatedUserAfterUpdate = {
          ...state.currentUser,
          tokisJoined: state.currentUser.tokisJoined + 1,
        };
        storage.set(STORAGE_KEYS.CURRENT_USER, updatedUserAfterUpdate);
      }
      
      return {
        ...state,
        tokis: updatedTokis,
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
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    checkConnection: () => Promise<void>;
    loadTokis: () => Promise<void>;
    loadTokisWithFilters: (filters: any) => Promise<void>;
    createToki: (tokiData: any) => Promise<string | null>;
    updateToki: (id: string, updates: any) => Promise<boolean>;
    deleteToki: (id: string) => Promise<boolean>;
    joinToki: (id: string) => Promise<boolean>;
    updateProfile: (updates: any) => Promise<boolean>;
    sendMessage: (message: string, tokiId?: string) => Promise<boolean>;
    loadUsers: () => Promise<void>;
    syncData: () => Promise<void>;
    clearAllData: () => Promise<void>;
    // Connection actions
    getConnections: () => Promise<{ connections: any[]; pagination: any }>;
    getConnectionsForToki: (tokiId: string) => Promise<{ connections: any[]; toki: { id: string; title: string } }>;
    getPendingConnections: () => Promise<any[]>;
    sendConnectionRequest: (userId: string) => Promise<boolean>;
    acceptConnectionRequest: (userId: string) => Promise<boolean>;
    declineConnectionRequest: (userId: string) => Promise<boolean>;
    removeConnection: (userId: string) => Promise<boolean>;
    // Rating actions
    getUserRatings: (userId: string) => Promise<void>;
    submitRating: (ratedUserId: string, tokiId: string, rating: number, reviewText?: string) => Promise<boolean>;
    updateRating: (ratingId: string, rating: number, reviewText?: string) => Promise<boolean>;
    deleteRating: (ratingId: string) => Promise<boolean>;
    getUserRatingStats: (userId: string) => Promise<void>;
    checkRatingsForToki: (tokiId: string) => Promise<{ success: boolean; message?: string; data?: any }>;
    // Blocking actions
    loadBlockedUsers: () => Promise<void>;
    loadBlockedByUsers: () => Promise<void>;
    blockUser: (userId: string, reason?: string) => Promise<boolean>;
    unblockUser: (userId: string) => Promise<boolean>;
    checkBlockStatus: (userId: string) => Promise<BlockStatus>;
    // User profile actions
    loadCurrentUser: () => Promise<void>;
    // User discovery actions
    searchUsers: (query?: string) => Promise<any[]>;
    // Toki join actions
    sendJoinRequest: (id: string) => Promise<'joined' | 'pending' | null>;
    approveJoinRequest: (tokiId: string, requestId: string) => Promise<boolean>;
    declineJoinRequest: (tokiId: string, requestId: string) => Promise<boolean>;
    getJoinRequests: (tokiId: string) => Promise<any[]>;
    // Toki management actions
    updateTokiBackend: (id: string, updates: any) => Promise<boolean>;
    deleteTokiBackend: (id: string) => Promise<boolean>;
    completeToki: (id: string) => Promise<boolean>;
    // Authentication actions
    checkAuthStatus: () => Promise<boolean>;
    logout: () => Promise<void>;
    // Messaging actions
    getConversations: () => Promise<any[]>;
    startConversation: (otherUserId: string) => Promise<string | null>;
    getConversationMessages: (conversationId: string) => Promise<any[]>;
    sendConversationMessage: (conversationId: string, content: string) => Promise<boolean>;
    getTokiMessages: (tokiId: string) => Promise<any[]>;
    sendTokiMessage: (tokiId: string, content: string) => Promise<boolean>;
    deleteMessage: (messageId: string) => Promise<boolean>;
    getTokiGroupChats: () => Promise<any[]>;
    // Mark as read actions
    markConversationAsRead: (conversationId: string) => Promise<boolean>;
    markTokiAsRead: (tokiId: string) => Promise<boolean>;
    reportMessage: (messageId: string, reason: string) => Promise<boolean>;

    // Socket management actions
    reestablishGlobalListeners: () => Promise<void>;
    testWebSocketListeners: () => void;
    // Saved Tokis actions
    getSavedTokis: () => Promise<SavedToki[]>;
    saveToki: (tokiId: string) => Promise<boolean>;
    unsaveToki: (tokiId: string) => Promise<boolean>;
    checkIfSaved: (tokiId: string) => Promise<boolean>;

    // Invites
    createInvite: (tokiId: string, invitedUserId: string) => Promise<boolean>;
    listInvites: (tokiId: string) => Promise<any[]>;
    respondToInvite: (tokiId: string, inviteId: string, action: 'accept' | 'decline') => Promise<boolean>;
    respondToInviteViaNotification: (notificationId: string, action: 'accept' | 'decline') => Promise<boolean>;

    // Invite Links (URL-based)
    generateInviteLink: (tokiId: string, opts?: { maxUses?: number | null; message?: string | null }) => Promise<any>;
    regenerateInviteLink: (tokiId: string, opts?: { maxUses?: number | null; message?: string | null }) => Promise<any>;
    deactivateInviteLink: (linkId: string) => Promise<boolean>;
    getInviteLinksForToki: (tokiId: string) => Promise<any>;
    getInviteLinkInfo: (code: string) => Promise<any>;
    joinByInviteCode: (inviteCode: string) => Promise<boolean>;

    // Hide / Unhide
    hideUser: (tokiId: string, userId: string) => Promise<boolean>;
    listHiddenUsers: (tokiId: string) => Promise<any[]>;
    unhideUser: (tokiId: string, userId: string) => Promise<boolean>;
    
    // Tokis
    getTokiById: (tokiId: string) => Promise<any>;
    
    // Remove Participant
    removeParticipant: (tokiId: string, userId: string) => Promise<boolean>;
    // Notifications
    loadNotifications: () => Promise<NotificationItem[]>;
    markNotificationRead: (id: string, source?: string, externalId?: string) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
    // Redirection actions
    setRedirection: (returnTo: string, params?: Record<string, string>) => void;
    clearRedirection: () => void;
  };


}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isFetchingTokis, setIsFetchingTokis] = useState(false);
  const [lastTokisFetchMs, setLastTokisFetchMs] = useState(0);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [lastConnectionCheckMs, setLastConnectionCheckMs] = useState(0);
  const [isCheckingAuthStatus, setIsCheckingAuthStatus] = useState(false);
  const [lastAuthStatusCheckMs, setLastAuthStatusCheckMs] = useState(0);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        console.log('🔄 Starting loadInitialData...');
        
        // Initialize API service
        await apiService.initialize();
        console.log('✅ API service initialized');
        
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
        
        // Check connection status
        await checkConnection();
        console.log('🌐 Connection status checked');
        
        // If authenticated, load current user and Tokis from backend
        const isAuthenticated = await apiService.isAuthenticated();
        console.log('🔐 Authentication check result:', isAuthenticated);
        
        if (isAuthenticated) {
          try {
            console.log('👤 Loading authenticated user data...');
            // Use the new loadCurrentUser function
            await loadCurrentUser();
            
            // Get the current user ID from the updated state
            const currentUserId = state.currentUser?.id;
            console.log('👤 Current user ID for loading Tokis:', currentUserId);
            
            // Load Tokis from backend with current user ID
            await loadTokis();
            
            // Connect to WebSocket
            await socketService.connect();
            if (currentUser.id) {
              await socketService.joinUser(currentUser.id);
              
              // Note: Global message listeners will be set up after actions are defined
            }
          } catch (error) {
            console.error('❌ Failed to load authenticated user data:', error);
            // Clear invalid tokens and use stored data
            await apiService.logout();
            console.log('🔄 Falling back to stored data after auth failure');
            dispatch({ type: 'SET_TOKIS', payload: tokis });
            dispatch({ type: 'UPDATE_CURRENT_USER', payload: currentUser });
            dispatch({ type: 'SET_MESSAGES', payload: messages });
            dispatch({ type: 'SET_LAST_SYNC_TIME', payload: lastSyncTime });
          }
        } else {
          // Use stored data if not authenticated
          console.log('📱 Using stored data (not authenticated)');
          dispatch({ type: 'SET_TOKIS', payload: tokis });
          dispatch({ type: 'UPDATE_CURRENT_USER', payload: currentUser });
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

  // Set up global message listeners for real-time notifications
  // This function is now defined after actions are available
  const setupGlobalMessageListeners = async () => {
    console.log('🔌 [APP CONTEXT] Setting up global message listeners...');
    console.log('🔌 [APP CONTEXT] Current user ID:', state.currentUser?.id);
    console.log('🔌 [APP CONTEXT] WebSocket connection status:', state.isConnected);
    console.log('🔌 [APP CONTEXT] Socket service status:', socketService.getConnectionStatus());
    
    // Clean up any existing listeners first
    socketService.offMessageReceived();
    socketService.offTokiMessageReceived();
    
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
        actions.getConversations();
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
        actions.getTokiGroupChats();
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
        const tokiGroupChats = await actions.getTokiGroupChats();
        
        // Use helper function to join rooms
        await joinTokiGroupChatRooms(tokiGroupChats);
        
      } catch (error) {
        console.error('❌ [APP CONTEXT] Failed to auto-join Toki rooms:', error);
      }
    }

    console.log('🔌 [APP CONTEXT] Global message listeners set up complete');
    console.log('🔌 [APP CONTEXT] Listeners should now receive message-received and toki-message-received events');
  };

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

  // Function to re-establish global message listeners (useful for reconnection scenarios)
  const reestablishGlobalListeners = async () => {
    if (state.currentUser?.id && state.isConnected) {
      console.log('🔌 [APP CONTEXT] Re-establishing global message listeners...');
      await setupGlobalMessageListeners();
    }
  };

  const checkConnection = async () => {
    try {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path.startsWith('/join') || path.startsWith('/login')) {
        console.log('🛑 Skipping health check on auth/join routes');
        return;
      }

      if (isCheckingConnection) {
        console.log('⏳ Skipping health check: already in-flight');
        return;
      }
      const now = Date.now();
      if (now - lastConnectionCheckMs < 3000) {
        console.log('🕒 Skipping health check: cooldown');
        return;
      }

      setIsCheckingConnection(true);
      setLastConnectionCheckMs(now);

      await apiService.healthCheck();
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
      dispatch({ type: 'SET_ERROR', payload: 'Unable to connect to server' });
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const syncData = async () => {
    try {
      // Frontend-only mode - just update sync time
      const now = new Date().toISOString();
      dispatch({ type: 'SET_LAST_SYNC_TIME', payload: now });
      console.log('✅ Frontend data synced successfully');
    } catch (error) {
      console.error('❌ Failed to sync frontend data:', error);
    }
  };

  const loadTokis = async () => {
    try {
      // Avoid hammering the API when entering via invite links or login
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path.startsWith('/join') || path.startsWith('/login')) {
        console.log('🛑 Skipping loadTokis on auth/join routes');
        return;
      }

      // De-duplicate concurrent and very frequent calls
      if (isFetchingTokis) {
        console.log('⏳ Skipping loadTokis: already in-flight');
        return;
      }
      const now = Date.now();
      if (now - lastTokisFetchMs < 3000) {
        console.log('🕒 Skipping loadTokis: cooldown');
        return;
      }

      setIsFetchingTokis(true);
      setLastTokisFetchMs(now);
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiService.getTokis();
      
      // Get current user ID from API service instead of state
      const currentUserId = apiService.getAccessToken() ? 
        (await apiService.getCurrentUser()).user.id : null;
      
      const apiTokis: Toki[] = response.tokis.map((apiToki: ApiToki) => ({
        id: apiToki.id,
        title: apiToki.title,
        description: apiToki.description,
        location: apiToki.location,
        time: apiToki.timeSlot || 'Time TBD', // Add fallback for undefined timeSlot
        attendees: apiToki.currentAttendees,
        maxAttendees: apiToki.maxAttendees,
        tags: apiToki.tags,
        host: {
          id: apiToki.host.id,
          name: apiToki.host.name,
          avatar: apiToki.host.avatar || '',
        },
        image: apiToki.imageUrl || '',
        distance: apiToki.distance ? `${apiToki.distance.km} km` : '0.0 km',
        isHostedByUser: currentUserId ? apiToki.host.id === currentUserId : false,
        joinStatus: apiToki.joinStatus || 'not_joined', // Use backend join status
        visibility: apiToki.visibility,
        category: apiToki.category,
        createdAt: apiToki.createdAt,
        scheduledTime: apiToki.scheduledTime, // Add scheduled time for better display
        // ADD MISSING COORDINATES
        latitude: apiToki.latitude ? (typeof apiToki.latitude === 'string' ? parseFloat(apiToki.latitude) : apiToki.latitude) : undefined,
        longitude: apiToki.longitude ? (typeof apiToki.longitude === 'string' ? parseFloat(apiToki.longitude) : apiToki.longitude) : undefined,
      }));
      
      dispatch({ type: 'SET_TOKIS', payload: apiTokis });
    } catch (error) {
      console.error('❌ Failed to load Tokis:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load activities' });
    } finally {
      setIsFetchingTokis(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadTokisWithFilters = async (filters: any) => {
    try {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path.startsWith('/join') || path.startsWith('/login')) {
        console.log('🛑 Skipping loadTokisWithFilters on auth/join routes');
        return;
      }

      if (isFetchingTokis) {
        console.log('⏳ Skipping loadTokisWithFilters: already in-flight');
        return;
      }

      setIsFetchingTokis(true);
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Build query string from filters
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          queryParams.append(key, value.toString());
        }
      });
      
      const response = await apiService.getTokis(filters);
      const apiTokis: Toki[] = response.tokis.map((apiToki: ApiToki) => ({
        id: apiToki.id,
        title: apiToki.title,
        description: apiToki.description,
        location: apiToki.location,
        time: apiToki.timeSlot || 'Time TBD', // Add fallback for undefined timeSlot
        attendees: apiToki.currentAttendees,
        maxAttendees: apiToki.maxAttendees,
        tags: apiToki.tags,
        host: {
          id: apiToki.host.id,
          name: apiToki.host.name,
          avatar: apiToki.host.avatar || '',
        },
        image: apiToki.imageUrl || '',
        distance: apiToki.distance ? `${apiToki.distance.km} km` : '0.0 km',
        isHostedByUser: apiToki.host.id === state.currentUser.id,
        joinStatus: apiToki.joinStatus || 'not_joined',
        visibility: apiToki.visibility,
        category: apiToki.category,
        createdAt: apiToki.createdAt,
        scheduledTime: apiToki.scheduledTime, // Add scheduled time for better display
        // ADD MISSING COORDINATES
        latitude: apiToki.latitude ? (typeof apiToki.latitude === 'string' ? parseFloat(apiToki.latitude) : apiToki.latitude) : undefined,
        longitude: apiToki.longitude ? (typeof apiToki.longitude === 'string' ? parseFloat(apiToki.longitude) : apiToki.longitude) : undefined,
      }));
      
      dispatch({ type: 'SET_TOKIS', payload: apiTokis });
    } catch (error) {
      console.error('❌ [APP CONTEXT] Failed to load Tokis with filters:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load filtered activities' });
    } finally {
      setIsFetchingTokis(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const createToki = async (tokiData: any): Promise<string | null> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Convert time slot to scheduled time
      const getScheduledTimeFromSlot = (timeSlot: string): string => {
        const now = new Date();
        
        switch (timeSlot) {
          case 'Now':
            return now.toISOString();
          case '30 min':
            return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
          case '1 hour':
            return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
          case '2 hours':
            return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
          case '3 hours':
            return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
          case 'Tonight':
            const tonight = new Date(now);
            tonight.setHours(19, 0, 0, 0); // 7:00 PM
            return tonight.toISOString();
          case 'Tomorrow':
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0); // 10:00 AM
            return tomorrow.toISOString();
          default:
            // Handle specific time slots like "9:00 AM", "2:00 PM"
            if (timeSlot.includes(':')) {
              const [time, period] = timeSlot.split(' ');
              const [hours, minutes] = time.split(':').map(Number);
              let hour24 = hours;
              
              if (period === 'PM' && hours !== 12) hour24 += 12;
              if (period === 'AM' && hours === 12) hour24 = 0;
              
              const scheduledTime = new Date(now);
              scheduledTime.setHours(hour24, minutes, 0, 0);
              
              // If the time has passed today, schedule for tomorrow
              if (scheduledTime <= now) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
              }
              
              return scheduledTime.toISOString();
            }
            return now.toISOString();
        }
      };

      const apiTokiData = {
        title: tokiData.title,
        description: tokiData.description,
        location: tokiData.location,
        timeSlot: tokiData.time,
        scheduledTime: tokiData.customDateTime || getScheduledTimeFromSlot(tokiData.time), // Use custom date/time if provided
        category: tokiData.activity,
        maxAttendees: tokiData.maxAttendees || 10,
        visibility: tokiData.visibility || 'public',
        tags: tokiData.tags || [],
      };

      const apiToki = await apiService.createToki(apiTokiData);
      
      const newToki: Toki = {
        id: apiToki.id,
        title: apiToki.title,
        description: apiToki.description,
        location: apiToki.location,
        time: apiToki.timeSlot || 'Time TBD', // Add fallback for undefined timeSlot
        attendees: apiToki.currentAttendees,
        maxAttendees: apiToki.maxAttendees,
        tags: apiToki.tags,
        host: {
          id: apiToki.host.id,
          name: apiToki.host.name,
          avatar: apiToki.host.avatar || '',
        },
        image: apiToki.imageUrl || getImageForActivity(tokiData.activity),
        distance: '0.0 km',
        isHostedByUser: true,
        joinStatus: 'not_joined', // Host doesn't need to join their own Toki
        visibility: apiToki.visibility,
        category: apiToki.category,
        createdAt: apiToki.createdAt,
        scheduledTime: apiToki.scheduledTime, // Add scheduled time for better display
      };
      
      dispatch({ type: 'ADD_TOKI', payload: newToki });
      
      console.log('✅ Toki created successfully:', newToki.title);
      return newToki.id;
    } catch (error) {
      console.error('❌ Failed to create Toki:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create activity' });
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateToki = async (id: string, updates: any): Promise<boolean> => {
    try {
      dispatch({ type: 'UPDATE_TOKI', payload: { id, updates } });
      
      // Update sync time
      setTimeout(() => syncData(), 100);
      
      console.log('✅ Toki updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to update Toki:', error);
      return false;
    }
  };

  const deleteToki = async (id: string): Promise<boolean> => {
    try {
      dispatch({ type: 'DELETE_TOKI', payload: id });
      
      // Update sync time
      setTimeout(() => syncData(), 100);
      
      console.log('✅ Toki deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete Toki:', error);
      return false;
    }
  };

  const joinToki = async (id: string): Promise<boolean> => {
    try {
      const toki = state.tokis.find(t => t.id === id);
      if (!toki) return false;

      console.log('🔄 Sending join request to backend for Toki:', id);
      
      // Call the actual backend API using the existing apiService method
      const result = await apiService.joinToki(id);

      if (!result.success) {
        console.error('❌ Backend join request failed:', result.message);
        throw new Error(result.message || 'Failed to join Toki');
      }

      console.log('✅ Backend join request successful:', result);

      // Update local state with the actual backend response
      dispatch({
        type: 'UPDATE_TOKI',
        payload: {
          id,
          updates: {
            joinStatus: result.data.status, // Use actual backend status
          },
        },
      });

      // Refresh user data to get updated tokisJoined count
      await loadCurrentUser();
      
      console.log('✅ Joined Toki successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to join Toki:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to join Toki' });
      return false;
    }
  };

  const sendJoinRequest = async (id: string): Promise<'joined' | 'pending' | null> => {
    try {
      console.log('🔄 Sending join request to backend for Toki:', id);
      
      const response = await apiService.joinToki(id);
      
      if (response.success) {
        const backendStatus = (response.data?.status as 'joined' | 'pending' | undefined) || 'pending';
        // Update local state to reflect backend status
        dispatch({
          type: 'UPDATE_TOKI',
          payload: {
            id,
            updates: {
              joinStatus: backendStatus,
            },
          },
        });

        // Update sync time
        setTimeout(() => syncData(), 100);
        
        console.log(`✅ Join flow successful with status: ${backendStatus}`);
        return backendStatus;
      } else {
        console.error('❌ Join request failed:', response.message);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to send join request:', error);
      return null;
    }
  };

  const approveJoinRequest = async (tokiId: string, requestId: string): Promise<boolean> => {
    try {
      console.log('✅ Approving join request:', requestId, 'for Toki:', tokiId);
      
      const response = await apiService.approveJoinRequest(tokiId, requestId);
      
      if (response.success) {
        console.log('✅ Join request approved successfully');
        return true;
      } else {
        console.error('❌ Failed to approve join request:', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to approve join request:', error);
      return false;
    }
  };

  const declineJoinRequest = async (tokiId: string, requestId: string): Promise<boolean> => {
    try {
      console.log('❌ Declining join request:', requestId, 'for Toki:', tokiId);
      
      const response = await apiService.declineJoinRequest(tokiId, requestId);
      
      if (response.success) {
        console.log('✅ Join request declined successfully');
        return true;
      } else {
        console.error('❌ Failed to decline join request:', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to decline join request:', error);
      return false;
    }
  };

  const getJoinRequests = async (tokiId: string): Promise<any[]> => {
    try {
      console.log('📋 Getting join requests for Toki:', tokiId);
      
      const response = await apiService.getJoinRequests(tokiId);
      
      if (response.success) {
        console.log('✅ Retrieved join requests:', response.data.requests);
        return response.data.requests;
      } else {
        console.error('❌ Failed to get join requests');
        return [];
      }
    } catch (error) {
      console.error('❌ Failed to get join requests:', error);
      return [];
    }
  };

  const updateTokiBackend = async (id: string, updates: any): Promise<boolean> => {
    console.log('📝 Updating Toki:', id, 'with updates:', updates);
    try {
      await apiService.updateToki(id, updates);
      
      // Update local state using existing action
      dispatch({
        type: 'UPDATE_TOKI',
        payload: { id, updates }
      });
      
      console.log('✅ Toki updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to update Toki:', error);
      return false;
    }
  };

  // Invites actions
  const createInvite = async (tokiId: string, invitedUserId: string): Promise<boolean> => {
    try {
      const res = await apiService.createInvite(tokiId, invitedUserId);
      return !!res;
    } catch (e) {
      console.error('❌ Failed to create invite:', e);
      return false;
    }
  };

  const listInvites = async (tokiId: string): Promise<any[]> => {
    try {
      const res = await apiService.listInvites(tokiId);
      return res.data?.invites || [];
    } catch (e) {
      console.error('❌ Failed to list invites:', e);
      return [];
    }
  };

  const respondToInvite = async (tokiId: string, inviteId: string, action: 'accept' | 'decline'): Promise<boolean> => {
    try {
      await apiService.respondToInvite(tokiId, inviteId, action);
      return true;
    } catch (e) {
      console.error('❌ Failed to respond to invite:', e);
      return false;
    }
  };

  const respondToInviteViaNotification = async (notificationId: string, action: 'accept' | 'decline'): Promise<boolean> => {
    try {
      await apiService.respondToInviteViaNotification(notificationId, action);
      return true;
    } catch (e) {
      console.error('❌ Failed to respond to invite via notification:', e);
      return false;
    }
  };

  // =========================
  // Invite Links (URL-based)
  // =========================
  const generateInviteLink = async (tokiId: string, opts?: { maxUses?: number | null; message?: string | null }): Promise<any> => {
    try {
      const res: any = await apiService.generateInviteLink(tokiId, opts);
      return res?.data || null;
    } catch (e) {
      console.error('❌ Failed to generate invite link:', e);
      return null;
    }
  };

  const regenerateInviteLink = async (tokiId: string, opts?: { maxUses?: number | null; message?: string | null }): Promise<any> => {
    try {
      const res: any = await apiService.regenerateInviteLink(tokiId, opts);
      return res?.data || null;
    } catch (e) {
      console.error('❌ Failed to regenerate invite link:', e);
      return null;
    }
  };

  const deactivateInviteLink = async (linkId: string): Promise<boolean> => {
    try {
      const res: any = await apiService.deactivateInviteLink(linkId);
      return !!res?.success;
    } catch (e) {
      console.error('❌ Failed to deactivate invite link:', e);
      return false;
    }
  };

  const getInviteLinksForToki = async (tokiId: string): Promise<any> => {
    try {
      const res: any = await apiService.getInviteLinksForToki(tokiId);
      return res?.data || { links: [], activeLink: null };
    } catch (e) {
      console.error('❌ Failed to load invite links for toki:', e);
      return { links: [], activeLink: null };
    }
  };

  const getInviteLinkInfo = async (code: string): Promise<any> => {
    try {
      const res: any = await apiService.getInviteLinkInfo(code);
      return res?.data || null;
    } catch (e) {
      console.error('❌ Failed to get invite link info:', e);
      return null;
    }
  };

  const joinByInviteCode = async (inviteCode: string): Promise<boolean> => {
    try {
      const res: any = await apiService.joinByInviteCode(inviteCode);
      if (res?.success) {
        // Refresh tokis so joinStatus reflects joined
        setTimeout(() => loadTokis(), 100);
        return true;
      }
      return false;
    } catch (e) {
      console.error('❌ Failed to join by invite code:', e);
      return false;
    }
  };

  // Hide actions
  const hideUser = async (tokiId: string, userId: string): Promise<boolean> => {
    try {
      await apiService.hideUser(tokiId, userId);
      return true;
    } catch (e) {
      console.error('❌ Failed to hide user:', e);
      return false;
    }
  };

  const listHiddenUsers = async (tokiId: string): Promise<any[]> => {
    try {
      const res: any = await apiService.listHiddenUsers(tokiId);
      return res?.data?.hiddenUsers || [];
    } catch (e) {
      console.error('❌ Failed to list hidden users:', e);
      return [];
    }
  };

  const unhideUser = async (tokiId: string, userId: string): Promise<boolean> => {
    try {
      await apiService.unhideUser(tokiId, userId);
      return true;
    } catch (e) {
      console.error('❌ Failed to unhide user:', e);
      return false;
    }
  };

  const getTokiById = async (tokiId: string): Promise<any> => {
    try {
      const data = await apiService.getToki(tokiId);
      return data;
    } catch (e) {
      console.error('❌ Failed to get toki by id:', e);
      return null;
    }
  };

  const removeParticipant = async (tokiId: string, userId: string): Promise<boolean> => {
    try {
      const response = await apiService.removeParticipant(tokiId, userId);
      if (response.success) {
        // Refresh the tokis data to update participants list
        setTimeout(() => loadTokis(), 100);
        return true;
      }
      return false;
    } catch (e) {
      console.error('❌ Failed to remove participant:', e);
      return false;
    }
  };

  const deleteTokiBackend = async (id: string): Promise<boolean> => {
    console.log('🗑️ Deleting Toki:', id);
    try {
      console.log('🗑️ Calling apiService.deleteToki...');
      await apiService.deleteToki(id);
      console.log('🗑️ API call successful');
      
      // Remove from local state
      console.log('🗑️ Updating local state...');
      const updatedTokis = state.tokis.filter(toki => toki.id !== id);
      console.log('🗑️ Tokis before:', state.tokis.length, 'after:', updatedTokis.length);
      
      dispatch({ type: 'SET_TOKIS', payload: updatedTokis });
      storage.set(STORAGE_KEYS.TOKIS, updatedTokis);
      
      console.log('✅ Toki deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete Toki:', error);
      return false;
    }
  };

  const completeToki = async (id: string): Promise<boolean> => {
    console.log('�� Completing Toki:', id);
    try {
      const response = await apiService.completeToki(id);
      if (response.success) {
        console.log('✅ Toki completed successfully');
        // Reload Tokis to get updated status
        await loadTokis();
        return true;
      } else {
        console.error('❌ Failed to complete Toki:', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to complete Toki:', error);
      return false;
    }
  };

  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      if (path.startsWith('/join') || path.startsWith('/login')) {
        console.log('🛑 Skipping auth status on auth/join routes');
        return false;
      }

      if (isCheckingAuthStatus) {
        console.log('⏳ Skipping auth status: already in-flight');
        return false;
      }
      const now = Date.now();
      if (now - lastAuthStatusCheckMs < 3000) {
        console.log('🕒 Skipping auth status: cooldown');
        return false;
      }

      setIsCheckingAuthStatus(true);
      setLastAuthStatusCheckMs(now);

      const isAuthenticated = await apiService.isAuthenticated();
      if (!isAuthenticated) {
        // Clear any stored user data when not authenticated
        dispatch({ type: 'UPDATE_CURRENT_USER', payload: emptyUser });
        console.log('🔐 User not authenticated, cleared user data');
      }
      return isAuthenticated;
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
      return false;
    } finally {
      setIsCheckingAuthStatus(false);
    }
  };

  const logout = async (): Promise<void> => {
    console.log('🚪 Starting logout process...');
    try {
      // Clear tokens from local storage (this is the key!)
      console.log('🗑️ Clearing auth tokens...');
      await apiService.clearTokens();
      
      // Clear all app data
      console.log('🗑️ Clearing app data...');
      await clearAllData();
      
      console.log('✅ User logged out successfully - tokens cleared');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Even if there's an error, clear tokens and data
      console.log('🔄 Fallback: clearing tokens and data...');
      await apiService.clearTokens();
      await clearAllData();
    }
  };

  const updateProfile = async (updates: any): Promise<boolean> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const apiUser = await apiService.updateProfile(updates);
      
      // Reload the full user data to get updated stats and social links
      await loadCurrentUser();
      
      console.log('✅ Profile updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update profile' });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

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
      setTimeout(() => syncData(), 100);
      
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
    
    console.log('🗑️ All data cleared including auth tokens');
  };

  // Rating actions
  const getUserRatings = async (userId: string) => {
    try {
      const response: any = await apiService.getUserRatings(userId);
      dispatch({ 
        type: 'SET_USER_RATINGS', 
        payload: { 
          userId, 
          ratings: response.ratings, 
          stats: response.stats 
        } 
      });
      console.log('✅ User ratings loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load user ratings:', error);
    }
  };

  const submitRating = async (ratedUserId: string, tokiId: string, rating: number, reviewText?: string): Promise<boolean> => {
    try {
      const response: any = await apiService.submitRating(ratedUserId, tokiId, rating, reviewText);
      if (response?.success) {
        // Reload ratings to get updated data
        await getUserRatings(ratedUserId);
        console.log('✅ Rating submitted successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to submit rating:', error);
      return false;
    }
  };

  const updateRating = async (ratingId: string, rating: number, reviewText?: string): Promise<boolean> => {
    try {
      const response = await apiService.updateRating(ratingId, rating, reviewText);
      if (response.success) {
        // Reload ratings to get updated data
        await getUserRatings(state.currentUser.id);
        console.log('✅ Rating updated successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to update rating:', error);
      return false;
    }
  };

  const deleteRating = async (ratingId: string): Promise<boolean> => {
    try {
      const response = await apiService.deleteRating(ratingId);
      if (response.success) {
        // Reload ratings to get updated data
        await getUserRatings(state.currentUser.id);
        console.log('✅ Rating deleted successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to delete rating:', error);
      return false;
    }
  };

  const getUserRatingStats = async (userId: string): Promise<void> => {
    try {
      const response = await apiService.getUserRatingStats(userId);
      if (response.success) {
        // Store rating stats in state using existing action type
        dispatch({ 
          type: 'SET_USER_RATINGS', 
          payload: { 
            userId, 
            ratings: [], // Empty array since we're only getting stats
            stats: response.data 
          } 
        });
        console.log('✅ User rating stats loaded successfully');
      } else {
        console.error('❌ Failed to load user rating stats:', response.message);
      }
    } catch (error) {
      console.error('❌ Failed to load user rating stats:', error);
    }
  };

  const checkRatingsForToki = async (tokiId: string): Promise<{ success: boolean; message?: string; data?: any }> => {
    try {
      const response = await apiService.checkRatingsForToki(tokiId);
      return response;
    } catch (error) {
      console.error('❌ Failed to check ratings for Toki:', error);
      return { success: false, message: 'Failed to check ratings' };
    }
  };

  // Blocking actions
  const loadBlockedUsers = async () => {
    try {
      const response = await apiService.getBlockedUsers();
      dispatch({ type: 'SET_BLOCKED_USERS', payload: response.blockedUsers });
      console.log('✅ Blocked users loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load blocked users:', error);
    }
  };

  const loadBlockedByUsers = async () => {
    try {
      const response = await apiService.getBlockedByUsers();
      dispatch({ type: 'SET_BLOCKED_BY_USERS', payload: response.blockedBy });
      console.log('✅ Users who blocked me loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load users who blocked me:', error);
    }
  };

  const blockUser = async (userId: string, reason?: string): Promise<boolean> => {
    try {
      const response = await apiService.blockUser(userId, reason);
      if (response.success) {
        // Reload blocked users list
        await loadBlockedUsers();
        console.log('✅ User blocked successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to block user:', error);
      return false;
    }
  };

  const unblockUser = async (userId: string): Promise<boolean> => {
    try {
      const response = await apiService.unblockUser(userId);
      if (response.success) {
        // Reload blocked users list
        await loadBlockedUsers();
        console.log('✅ User unblocked successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to unblock user:', error);
      return false;
    }
  };

  const checkBlockStatus = async (userId: string): Promise<BlockStatus> => {
    try {
      const status = await apiService.checkBlockStatus(userId);
      console.log('✅ Block status checked successfully');
      return status;
    } catch (error) {
      console.error('❌ Failed to check block status:', error);
      return { blockedByMe: false, blockedByThem: false, canInteract: true };
    }
  };

  // User profile actions
  const loadCurrentUser = async (): Promise<void> => {
    console.log('🔄 loadCurrentUser called');
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Get the full response to access user and stats
      console.log('🌐 Calling apiService.getCurrentUser()...');
      const response = await apiService.getCurrentUser();
      console.log('🌐 API response received:', response);
      
      // The API service already extracts response.data, so we get: { user: User; socialLinks: any; stats: any; verified: boolean }
      const user = response.user;
      const stats = response.stats;
      console.log('👤 User data from API:', user);
      console.log('📊 Stats data from API:', stats);
      console.log('🔗 Social links from API:', response.socialLinks);
      
      // Transform backend user data to match our interface
      const transformedUser: User = {
        id: user.id,
        name: user.name,
        email: user.email,
        bio: user.bio || '',
        location: user.location || '',
        avatar: user.avatar || 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        verified: response.verified,
        socialLinks: response.socialLinks || {},
        memberSince: user.memberSince,
        tokisCreated: stats?.tokis_created || 0,
        tokisJoined: stats?.tokis_joined || 0,
        connections: stats?.connections_count || 0,
        rating: parseFloat(user.rating) || 0,
        latitude: user.latitude,
        longitude: user.longitude,
      };

      console.log('🔄 Dispatching UPDATE_CURRENT_USER with:', transformedUser);
      dispatch({ type: 'UPDATE_CURRENT_USER', payload: transformedUser });
      storage.set(STORAGE_KEYS.CURRENT_USER, transformedUser);
      console.log('✅ Current user loaded successfully:', transformedUser.name);
      console.log('📊 User stats:', { tokisCreated: transformedUser.tokisCreated, tokisJoined: transformedUser.tokisJoined, connections: transformedUser.connections });
      
      // Force a re-render by dispatching again after a short delay
      setTimeout(() => {
        console.log('🔄 Forcing stats update...');
        dispatch({ type: 'UPDATE_CURRENT_USER', payload: transformedUser });
      }, 100);
    } catch (error) {
      console.error('❌ Failed to load current user:', error);
      // Don't show error alert here as it might be expected if user is not logged in
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Connection actions
  const getConnections = async (): Promise<{ connections: any[]; pagination: any }> => {
    try {
      const response = await apiService.getConnections();
      console.log('✅ Connections loaded successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to load connections:', error);
      return { connections: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } };
    }
  };

  const getConnectionsForToki = async (tokiId: string): Promise<{ connections: any[]; toki: { id: string; title: string } }> => {
    try {
      const response = await apiService.getConnectionsForToki(tokiId);
      console.log('✅ Connections for toki loaded successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to load connections for toki:', error);
      return { connections: [], toki: { id: tokiId, title: '' } };
    }
  };

  const getPendingConnections = async (): Promise<any[]> => {
    try {
      const response = await apiService.getPendingConnections();
      console.log('✅ Pending connections loaded successfully');
      return response;
    } catch (error) {
      console.error('❌ Failed to load pending connections:', error);
      return [];
    }
  };

  const sendConnectionRequest = async (userId: string): Promise<boolean> => {
    try {
      await apiService.sendConnectionRequest(userId);
      console.log('✅ Connection request sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to send connection request:', error);
      return false;
    }
  };

  const acceptConnectionRequest = async (userId: string): Promise<boolean> => {
    try {
      await apiService.respondToConnectionRequest(userId, 'accept');
      console.log('✅ Connection request accepted successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to accept connection request:', error);
      return false;
    }
  };

  const declineConnectionRequest = async (userId: string): Promise<boolean> => {
    try {
      await apiService.respondToConnectionRequest(userId, 'decline');
      console.log('✅ Connection request declined successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to decline connection request:', error);
      return false;
    }
  };

  const removeConnection = async (userId: string): Promise<boolean> => {
    try {
      await apiService.removeConnection(userId);
      console.log('✅ Connection removed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to remove connection:', error);
      return false;
    }
  };

  const searchUsers = async (query?: string): Promise<any[]> => {
    try {
      console.log('🔍 Searching for users with query:', query);
      const response = await apiService.searchUsers({ q: query });
      console.log('✅ API response:', response);
      console.log('✅ Users found:', response.users.length);
      return response.users;
    } catch (error) {
      console.error('❌ Failed to search users:', error);
      return [];
    }
  };

  // Messaging actions
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
        await joinTokiGroupChatRooms(response.chats);
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

  const getImageForActivity = (activity: string) => {
    const activityImages: { [key: string]: string } = {
      sports: 'https://images.pexels.com/photos/1263348/pexels-photo-1263348.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      coffee: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      music: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      dinner: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      work: 'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      culture: 'https://images.pexels.com/photos/1570264/pexels-photo-1570264.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      nature: 'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      drinks: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      wellness: 'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
      chill: 'https://images.pexels.com/photos/7988215/pexels-photo-7988215.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
    };
    return activityImages[activity] || activityImages.sports;
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
      const savedTokis = await apiService.getSavedTokis();
      dispatch({ type: 'SET_SAVED_TOKIS', payload: savedTokis });
      return savedTokis;
    } catch (error) {
      console.error('❌ Failed to load saved Tokis:', error);
      return [];
    }
  };

  const saveToki = async (tokiId: string): Promise<boolean> => {
    try {
      const success = await apiService.saveToki(tokiId);
      if (success) {
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

  // =========================
  // Notifications (Unread)
  // =========================
  const loadNotifications = async (): Promise<NotificationItem[]> => {
    try {
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
    }
  };

  const markNotificationRead = async (id: string, source?: string, externalId?: string): Promise<void> => {
    try {
      // Optimistic update for now
      dispatch({ type: 'MARK_NOTIFICATION_READ', payload: { id } });
      // Backend PATCH unified
      try {
        await fetch(`${getBackendUrl()}/api/notifications/read`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${await apiService.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(source && externalId ? { source, externalId } : { items: [{ source: 'system', externalId: id.replace(/^sys-/, '') }] }),
        });
      } catch {}
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
    }
  };

  const markAllNotificationsRead = async (): Promise<void> => {
    try {
      // Optimistic update for now
      dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
      // Backend PATCH in batch
      try {
        const items = (state.notifications || []).map((n: any) => ({ source: n.source || 'system', externalId: n.externalId || String(n.id).replace(/^sys-/, '') }));
        await fetch(`${getBackendUrl()}/api/notifications/read`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${await apiService.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items }),
        });
      } catch {}
    } catch (error) {
      console.error('❌ Failed to mark all notifications as read:', error);
    }
  };

  // Check connection and sync on mount
  useEffect(() => {
    const initializeApp = async () => {
      await checkConnection();
      await syncData();
    };
    
    initializeApp();
    
    // Sync data every 5 minutes (just updates timestamp)
    const syncInterval = setInterval(syncData, 300000);
    
    // Check authentication status every 10 minutes
    const authInterval = setInterval(async () => {
      if (state.isConnected) {
        await checkAuthStatus();
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
          await setupGlobalMessageListeners();
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
      loadNotifications();
    }
  }, [state.currentUser?.id]); // Remove state.isConnected dependency

        const actions = {
        checkConnection,
        loadTokis,
        loadTokisWithFilters,
        createToki,
    updateToki,
    deleteToki,
    joinToki,
    updateProfile,
    sendMessage,
    loadUsers,
    syncData,
    clearAllData,
    // Connection actions
    getConnections,
    getConnectionsForToki,
    getPendingConnections,
    sendConnectionRequest,
    acceptConnectionRequest,
    declineConnectionRequest,
    removeConnection,
    // Rating actions
    getUserRatings,
    submitRating,
    updateRating,
    deleteRating,
    getUserRatingStats,
    checkRatingsForToki,
    // Blocking actions
    loadBlockedUsers,
    loadBlockedByUsers,
    blockUser,
    unblockUser,
    checkBlockStatus,
    // User profile actions
    loadCurrentUser,
    // User discovery actions
    searchUsers,
    // Toki join actions
    sendJoinRequest,
    approveJoinRequest,
    declineJoinRequest,
    getJoinRequests,
    // Toki management actions
    updateTokiBackend,
    deleteTokiBackend,
    completeToki,
    // Invites
    createInvite,
    listInvites,
    respondToInvite,
    respondToInviteViaNotification,
    // Invite Links
    generateInviteLink,
    regenerateInviteLink,
    deactivateInviteLink,
    getInviteLinksForToki,
    getInviteLinkInfo,
    joinByInviteCode,
    // Hide
    hideUser,
    listHiddenUsers,
    unhideUser,
    // Remove Participant
    removeParticipant,
    // Tokis
    getTokiById,
    // Authentication actions
    checkAuthStatus,
    logout,
    // Messaging actions
    getConversations,
    startConversation,
    getConversationMessages,
    sendConversationMessage,
    getTokiMessages,
    sendTokiMessage,
    deleteMessage,
    getTokiGroupChats,
    // Mark as read actions
    markConversationAsRead,
    markTokiAsRead,
    // Message moderation actions
    reportMessage,
    // Socket management actions
    reestablishGlobalListeners,
    testWebSocketListeners,
    // Saved Tokis actions
    getSavedTokis,
    saveToki,
    unsaveToki,
    checkIfSaved,
    // User update actions
    updateCurrentUser,
    // Notifications
    loadNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    // Redirection actions
    setRedirection: (returnTo: string, params?: Record<string, string>) => {
      dispatch({ type: 'SET_REDIRECTION', payload: { returnTo, returnParams: params } });
    },
    clearRedirection: () => {
      dispatch({ type: 'CLEAR_REDIRECTION' });
    },
  };

  return (
    <AppContext.Provider value={{ state, dispatch, actions }}>
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