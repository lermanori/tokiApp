// Auto-generated slice — do not edit manually.
// Source: contexts/AppContext.tsx lines 258-347
// Phase-1 pure extraction: emptyUser, loadStoredData, initialState, formatDistanceString.

import { User, AppState, Toki } from './types';
import { STORAGE_KEYS, storage } from './constants';

export const emptyUser: User = {
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
export const loadStoredData = async () => {
  const storedTokis = await storage.get(STORAGE_KEYS.TOKIS) || [];
  const storedUser = await storage.get(STORAGE_KEYS.CURRENT_USER);
  const storedMessages = await storage.get(STORAGE_KEYS.MESSAGES) || [];
  const lastSyncTime = await storage.get(STORAGE_KEYS.LAST_SYNC);

  // Only use stored user if it exists and has a real ID (not empty)
  const currentUser = storedUser && storedUser.id && storedUser.id !== '' ? storedUser : emptyUser;

  // Calculate user stats from stored data
  const userTokis = storedTokis.filter((toki: Toki) => toki.isHostedByUser);
  const joinedTokis = storedTokis.filter((toki: Toki) =>
    !toki.isHostedByUser && toki.joinStatus === 'approved'
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
export const initialState: AppState = {
  tokis: [],
  mapTokis: [],
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
  totalNearbyCount: 0,
  connections: [],
  pendingConnections: [],
  userConnectionsIds: [],
  anonymousLanding: {
    isAnonymousLanding: false,
    landingRoute: null,
    landingParams: null,
    pendingIntent: null,
  },
};

export const formatDistanceString = (distance?: { km: number; miles: number } | string): string => {
  if (!distance) return '0.0 km';
  if (typeof distance === 'string') return distance;
  if (typeof distance.km === 'number' && Number.isFinite(distance.km)) {
    return `${distance.km} km`;
  }
  return '0.0 km';
};
