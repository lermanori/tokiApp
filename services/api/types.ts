// Type definitions extracted from services/api.ts (Phase-1 split).
// All types are re-exported from `services/api.ts` for back-compat —
// consumers can continue importing from either path.

export type LoginAnalyticsSource = 'startup_reauth' | 'manual_login';
export type LoginAnalyticsReason = 'access_expired' | 'refresh_failed' | 'no_session';

export interface StartupAuthTelemetry {
  hadStoredTokens: boolean;
  refreshAttempted: boolean;
  refreshSucceeded: boolean;
  refreshFailureReason: LoginAnalyticsReason | null;
  loginRequired: boolean;
}

export interface PendingLoginAnalyticsContext {
  source: LoginAnalyticsSource;
  hadStoredTokens: boolean;
  reason: LoginAnalyticsReason;
}

// Types
export interface Toki {
  id: string;
  title: string;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  timeSlot: string;
  scheduledTime?: string;
  maxAttendees: number | null;
  currentAttendees: number;
  category: string;
  visibility: 'public' | 'connections' | 'friends';
  autoApprove?: boolean;
  imageUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  host: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
    location?: string;
  };
  tags: string[];
  distance?: {
    km: number;
    miles: number;
  };
  joinStatus?: 'not_joined' | 'pending' | 'approved';
  externalLink?: string;
  friendsAttending?: Array<{ id: string; name: string; avatar?: string }>;
  isPaid?: boolean;
  isBoosted?: boolean;
  boostId?: string | null;
  algorithmScore?: number | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  location?: string;
  avatar?: string;
  verified: boolean;
  latitude?: number;
  longitude?: number;
  rating: string;
  memberSince: string;
  createdAt: string;
  updatedAt: string;
  socialLinks?: {
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
    facebook?: string;
  };
  stats?: {
    tokis_created: number;
    tokis_joined: number;
    connections_count: number;
  };
}

export interface UserStats {
  tokisCreated: number;
  tokisJoined: number;
  connections: number;
  pendingRequests: number;
  sentRequests: number;
  totalActivity: number;
}

export interface Connection {
  id: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
    location?: string;
  };
}

export interface PendingConnection {
  id: string;
  createdAt: string;
  requester: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
    location?: string;
  };
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface PopularTag {
  name: string;
  count: number;
}

export interface UserRating {
  id: string;
  raterId: string;
  ratedUserId: string;
  tokiId: string;
  rating: number;
  reviewText?: string;
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

export interface BoostPurchaseRequest {
  id: string;
  tierId: string;
  tierName: string;
  tierSlug: string;
  tokiId?: string | null;
  tokiTitle?: string | null;
  hostId?: string;
  paymentAmount: number;
  paymentCurrency: string;
  totalHours: number;
  isSplittable: boolean;
  validityDays?: number | null;
  status: 'pending_code' | 'code_issued' | 'approved' | 'expired' | 'cancelled';
  codeStatus?: string;
  codeGeneratedAt?: string | null;
  codeExpiresAt?: string | null;
  codeRedeemedAt?: string | null;
  redeemedAt?: string | null;
  boostId?: string | null;
  generatedByAdminId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserRatingStats {
  averageRating: number;
  totalRatings: number;
  totalReviews: number;
}

export interface BlockedUser {
  id: string;
  reason?: string;
  createdAt: string;
  blockedUser: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
  };
}

export interface BlockStatus {
  blockedByMe: boolean;
  blockedByThem: boolean;
  canInteract: boolean;
}

// Messaging Interfaces
export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string;
  other_user_bio?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
}

export interface Message {
  id: string;
  content: string;
  message_type: string;
  media_url?: string;
  created_at: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
}

export interface AuthResponse {
  success: boolean;
  requiresTermsAcceptance?: boolean;
  message: string;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

export interface OAuthResponse {
  success: boolean;
  isNewUser: boolean;
  requiresProfileCompletion: boolean;
  message: string;
  data: {
    user: User & {
      hasPassword: boolean;
      profileCompleted: boolean;
    };
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

