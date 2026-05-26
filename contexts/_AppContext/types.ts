// Auto-generated slice — do not edit manually.
// Source: contexts/AppContext.tsx lines 14-204, 604-729
// Phase-1 pure extraction: types, interfaces, and AppContextType.

import React from 'react';
import { ProtectedIntent } from '../../utils/anonymousLanding';
import { UserStats, UserRating, UserRatingStats, BlockedUser, BlockStatus } from '../../services/api';

export interface Toki {
  id: string;
  title: string;
  description: string;
  location: string;
  time: string;
  attendees: number;
  currentAttendees?: number;
  maxAttendees: number | null;
  tags: string[];
  host: {
    id: string;
    name: string;
    avatar: string;
  };
  image: string;
  distance: string;
  isHostedByUser?: boolean;
  joinStatus?: 'not_joined' | 'pending' | 'approved';
  visibility: 'public' | 'connections' | 'friends';
  category: string;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  friendsGoing?: Array<{ id: string; name: string; avatar?: string }>;
  scheduledTime?: string; // Add scheduled time for better display
  isSaved?: boolean;
  algorithmScore?: number | null;
  isBoosted?: boolean;
  boostId?: string | null;
  isPaid?: boolean;
  autoApprove?: boolean;
  externalLink?: string;
}

export interface User {
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

export interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: string;
  isOwn: boolean;
  tokiId?: string;
  createdAt: string;
}

export interface SavedToki {
  id: string;
  title: string;
  description: string;
  location: string;
  timeSlot: string;
  scheduledTime: string;
  currentAttendees: number;
  maxAttendees: number | null;
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
export interface NotificationItem {
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

export interface RedirectionState {
  returnTo: string | null;
  returnParams: Record<string, string> | null;
  isRedirecting: boolean;
}

export interface AnonymousLandingState {
  isAnonymousLanding: boolean;
  landingRoute: string | null;
  landingParams: Record<string, string> | null;
  pendingIntent: ProtectedIntent | null;
}

export interface AppState {
  tokis: Toki[];
  mapTokis: Toki[];
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
  totalNearbyCount: number;
  connections: any[];
  pendingConnections: any[];
  userConnectionsIds: string[];
  anonymousLanding: AnonymousLandingState;
}

export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_REDIRECTION'; payload: { returnTo: string; returnParams?: Record<string, string> } }
  | { type: 'CLEAR_REDIRECTION' }
  | { type: 'START_ANONYMOUS_LANDING'; payload: { landingRoute: string; landingParams?: Record<string, string> } }
  | { type: 'CLEAR_ANONYMOUS_LANDING' }
  | { type: 'SET_PENDING_INTENT'; payload: ProtectedIntent }
  | { type: 'CLEAR_PENDING_INTENT' }
  | { type: 'SET_TOKIS'; payload: Toki[] }
  | { type: 'SET_MAP_TOKIS'; payload: Toki[] }
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
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'SET_TOTAL_NEARBY_COUNT'; payload: number }
  | { type: 'SET_CONNECTIONS'; payload: any[] }
  | { type: 'SET_PENDING_CONNECTIONS'; payload: any[] }
  | { type: 'ADD_CONNECTION'; payload: any }
  | { type: 'REMOVE_CONNECTION'; payload: string }
  | { type: 'UPDATE_CONNECTION'; payload: { id: string; updates: any } };


export interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    checkConnection: () => Promise<void>;
    loadTokis: () => Promise<void>;
    loadMyTokis: () => Promise<void>;
    loadTokisWithFilters: (filters: any) => Promise<void>;
    loadNearbyTokis: (params: { latitude: number; longitude: number; radius?: number; page?: number; category?: string; timeSlot?: string }, append?: boolean) => Promise<{ pagination: any }>;
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
    getFriendsAttendingToki: (tokiId: string) => Promise<Array<{ id: string; name: string; avatar?: string }>>;
    getPendingConnections: () => Promise<any[]>;
    sendConnectionRequest: (userId: string) => Promise<boolean>;
    acceptConnectionRequest: (userId: string) => Promise<boolean>;
    declineConnectionRequest: (userId: string) => Promise<boolean>;
    removeConnection: (userId: string) => Promise<boolean>;
    cancelConnectionRequest: (userId: string) => Promise<boolean>;
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
    sendJoinRequest: (id: string) => Promise<'approved' | 'pending' | null>;
    cancelJoinRequest: (tokiId: string) => Promise<boolean>;
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
    reportToki: (tokiId: string, reason: string) => Promise<boolean>;
    reportUser: (userId: string, reason: string) => Promise<boolean>;
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
    viewToki: (tokiId: string) => Promise<void>;

    // Remove Participant
    removeParticipant: (tokiId: string, userId: string) => Promise<boolean>;
    // Notifications
    loadNotifications: () => Promise<NotificationItem[]>;
    markNotificationRead: (id: string, source?: string, externalId?: string) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
    markNotificationsAsRead: () => Promise<void>;
    // Redirection actions
    setRedirection: (returnTo: string, params?: Record<string, string>) => void;
    clearRedirection: () => void;
    startAnonymousLanding: (landingRoute: string, landingParams?: Record<string, string>) => void;
    clearAnonymousLanding: () => void;
    setPendingIntent: (intent: ProtectedIntent) => void;
    consumePendingIntent: () => void;
    requireAuthForIntent: (intent: ProtectedIntent) => boolean;
  };


}

