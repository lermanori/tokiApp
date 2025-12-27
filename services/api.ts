// API Configuration
import { getBackendUrl } from './config';

const API_BASE_URL = `${getBackendUrl()}/api`;

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

// API Service Class
class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private authCache: { isValid: boolean; timestamp: number } | null = null;
  private readonly AUTH_CACHE_DURATION = 30000; // 30 seconds
  private userCache: { 
    data: { user: User; socialLinks: any; stats: any; verified: boolean }; 
    timestamp: number 
  } | null = null;
  private readonly USER_CACHE_DURATION = 60000; // 60 seconds - user data changes less frequently
  private pendingGetCurrentUser: Promise<{ user: User; socialLinks: any; stats: any; verified: boolean }> | null = null;

  constructor() {
    // Initialize tokens synchronously - they will be loaded when needed
  }

  // Initialize the service - call this after the service is created
  async initialize() {
    await this.loadTokens();
  }

  private async loadTokens() {
    try {
      console.debug('🔍 [API] Attempting to load stored tokens...');
      const tokens = await AsyncStorage.getItem('auth_tokens');
      console.debug('🔍 [API] Raw tokens from storage:', tokens);
      
      if (tokens) {
        const { accessToken, refreshToken } = JSON.parse(tokens);
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        console.debug('✅ [API] Tokens loaded successfully:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          accessTokenLength: accessToken?.length || 0
        });
      } else {
        console.info('⚠️ [API] No tokens found in storage');
      }
    } catch (error) {
      console.error('❌ [API] Error loading tokens:', error);
    }
  }

  private async saveTokens(accessToken: string, refreshToken: string) {
    try {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.authCache = null; // Clear auth cache when tokens change
      this.userCache = null; // Clear user cache when tokens change (new login = new user data)
      await AsyncStorage.setItem('auth_tokens', JSON.stringify({ accessToken, refreshToken }));
      console.log('💾 Tokens saved successfully');
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  async clearTokens() {
    try {
      console.log('🗑️ Clearing tokens from memory and storage...');
      this.accessToken = null;
      this.refreshToken = null;
      this.authCache = null; // Clear auth cache
      this.userCache = null; // Clear user cache
      await AsyncStorage.removeItem('auth_tokens');
      
      // Verify tokens are cleared
      const remainingTokens = await AsyncStorage.getItem('auth_tokens');
      console.log('🔍 Tokens after clearing:', remainingTokens ? 'STILL EXIST' : 'CLEARED SUCCESSFULLY');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  private clearUserCache() {
    this.userCache = null;
    this.pendingGetCurrentUser = null; // Also clear pending request
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    
    return headers;
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ [API] Request failed: ${response.status} ${response.statusText}`);
        
        if (response.status === 401 && this.refreshToken) {
          console.info('🔄 [API] Attempting token refresh...');
          // Try to refresh token
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            console.info('✅ [API] Token refresh successful, retrying request...');
            // Retry the original request
            config.headers = this.getHeaders();
            const retryResponse = await fetch(url, config);
            const retryData = await retryResponse.json();
            
            if (!retryResponse.ok) {
              console.error(`❌ [API] Retry request failed: ${retryResponse.status}`);
              throw new Error(retryData.message || 'Request failed after token refresh');
            }
            return retryData;
          } else {
            console.error('❌ [API] Token refresh failed');
            // Token refresh failed, clear tokens and throw authentication error
            await this.clearTokens();
            throw new Error('Authentication failed. Please log in again.');
          }
        }
        
        // Create a more descriptive error message
        const errorMessage = data.message || `HTTP ${response.status}: ${response.statusText}`;
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).isAuthError = response.status === 401 || response.status === 403;
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`❌ [API] Request failed for ${endpoint}:`, error);
      console.error(`❌ [API] Full URL attempted: ${url}`);
      console.error(`❌ [API] Base URL: ${API_BASE_URL}`);
      
      // Enhance error with more context
      if (error instanceof Error) {
        (error as any).endpoint = endpoint;
        (error as any).url = url;
      }
      
      throw error;
    }
  }

  // Generic POST method
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        await this.saveTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
      
      // Only clear tokens if refresh token is actually invalid/expired (401)
      // This means the refresh token itself is expired or invalid
      if (response.status === 401) {
        console.log('🗑️ [API] Refresh token expired or invalid, clearing tokens');
        await this.clearTokens();
        return false;
      }
      
      // For other HTTP errors, don't clear tokens - might be server issue
      console.error('⚠️ [API] Token refresh failed with status:', response.status);
      return false;
    } catch (error) {
      // Check if this is a network error (TypeError from fetch, or network-related message)
      const isNetworkError = error instanceof TypeError || 
                            (error instanceof Error && (
                              error.message.includes('Network request failed') ||
                              error.message.includes('Failed to fetch') ||
                              error.message.includes('timeout') ||
                              error.message.includes('network') ||
                              error.message.includes('NetworkError')
                            ));
      
      if (isNetworkError) {
        console.error('⚠️ [API] Token refresh failed due to network error, keeping tokens:', error);
        // Don't clear tokens on network errors - they might still be valid
        // The user might just have poor connectivity
        return false;
      } else {
        // For other errors (parsing, etc.), also don't clear tokens
        // Only clear on confirmed auth failures
        console.error('⚠️ [API] Token refresh failed with unexpected error, keeping tokens:', error);
        return false;
      }
    }
  }

  // Authentication Methods
  async register(userData: { name: string; email: string; password: string; bio?: string; location?: string; latitude?: number; longitude?: number; termsAccepted: boolean }): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.success) {
      await this.saveTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }

    return response;
  }

  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Always save tokens if they exist (even if terms acceptance required)
    // This allows the accept-terms endpoint to work
    if (response.success && response.data.tokens) {
      await this.saveTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }

    return response;
  }

  async acceptTerms(): Promise<{ success: boolean; data: { tokens: { accessToken: string; refreshToken: string } }; message: string }> {
    const response = await this.makeRequest<{ success: boolean; data: { tokens: { accessToken: string; refreshToken: string } }; message: string }>('/auth/accept-terms', {
      method: 'POST',
    });

    if (response.success && response.data.tokens) {
      await this.saveTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }

    return response;
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await this.makeRequest<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return response;
  }

  async logout(): Promise<void> {
    if (this.accessToken) {
      try {
        await this.makeRequest('/auth/logout', { method: 'POST' });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }
  }

  async deleteAccount(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; message: string }>('/auth/me', {
        method: 'DELETE',
      });
      
      // Clear tokens immediately after successful deletion
      await this.clearTokens();
      
      return { success: true, message: response.message || 'Account deleted successfully' };
    } catch (error) {
      console.error('Delete account error:', error);
      
      // If it's an auth error, clear tokens anyway
      if (error instanceof Error && ((error as any).isAuthError || (error as any).status === 401 || (error as any).status === 403)) {
        await this.clearTokens();
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete account';
      return { success: false, message: errorMessage };
    }
  }

  // Invitation Methods
  async sendInvitation(email: string): Promise<{ success: boolean; data: { invitation: any; remainingCredits: number } }> {
    return this.makeRequest('/invitations', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async getInvitations(status?: string): Promise<{ success: boolean; data: any[] }> {
    const url = status ? `/invitations?status=${status}` : '/invitations';
    return this.makeRequest(url);
  }

  async getInvitationCredits(): Promise<{ success: boolean; data: { credits: number } }> {
    return this.makeRequest('/invitations/credits');
  }

  async validateInvitationCode(code: string): Promise<{ success: boolean; data: { email: string; inviterName: string; expiresAt: string } }> {
    return this.makeRequest(`/invitations/validate/${code}`);
  }

  async registerWithInvitation(userData: { name: string; email: string; password: string; bio?: string; location?: string; latitude?: number; longitude?: number; invitationCode: string }): Promise<AuthResponse> {
    const response = await this.makeRequest<AuthResponse>('/auth/register/invite', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    // Don't save tokens - user will log in separately
    return response;
  }

  async getCurrentUser(forceRefresh: boolean = false): Promise<{ user: User; socialLinks: any; stats: any; verified: boolean }> {
    // Check cache first unless force refresh is requested
    if (!forceRefresh && this.userCache && Date.now() - this.userCache.timestamp < this.USER_CACHE_DURATION) {
      console.log('👤 [API] Using cached user data');
      return this.userCache.data;
    }

    // If there's already a pending request, return that promise instead of making a new call
    if (this.pendingGetCurrentUser) {
      console.log('👤 [API] Reusing pending getCurrentUser request');
      return this.pendingGetCurrentUser;
    }

    // Create the request promise
    const requestPromise = (async () => {
      try {
        const response = await this.makeRequest<{ 
          success: boolean; 
          data: {
            user: User & {
              stats: any;
              socialLinks: any;
            };
          }
        }>('/auth/me');
        
        // Extract stats and socialLinks from the user object
        const { stats, socialLinks, ...user } = response.data.user;
        
        const userData = {
          user,
          stats,
          socialLinks,
          verified: user.verified
        };

        // Cache the user data
        this.userCache = {
          data: userData,
          timestamp: Date.now()
        };

        return userData;
      } finally {
        // Clear the pending request when done
        this.pendingGetCurrentUser = null;
      }
    })();

    // Store the pending request
    this.pendingGetCurrentUser = requestPromise;
    return requestPromise;
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    console.log('🟡 [API] updateProfile called with:', updates);
    console.log('🟡 [API] Making request to /auth/me...');
    const response = await this.makeRequest<{ success: boolean; data: { user: User } }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    console.log('🟡 [API] Request completed, response:', response);
    // Clear user cache after update to force refresh on next getCurrentUser call
    this.clearUserCache();
    return response.data.user;
  }

  async getUserStats(): Promise<UserStats> {
    // Reuse getCurrentUser which has caching, instead of making a separate call
    const userData = await this.getCurrentUser();
    return userData.stats;
  }

  // Toki Methods
  async getTokis(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    timeSlot?: string;
    visibility?: string;
    sortBy?: string;
    sortOrder?: string;
    dateFrom?: string;
    dateTo?: string;
    radius?: string;
    userLatitude?: string;
    userLongitude?: string;
  }): Promise<{ tokis: Toki[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await this.makeRequest<{ success: boolean; data: { tokis: Toki[]; pagination: any } }>(
      `/tokis?${queryParams.toString()}`
    );
    return response.data;
  }

  async getMyTokis(): Promise<{ tokis: Toki[]; pagination: any }> {
    const response = await this.makeRequest<{ success: boolean; tokis: Toki[]; pagination: any }>('/tokis/my-tokis');
    return { tokis: response.tokis, pagination: response.pagination };
  }

  async getToki(id: string): Promise<Toki> {
    const response = await this.makeRequest<{ success: boolean; data: Toki }>(`/tokis/${id}`);
    return response.data;
  }

  async createToki(tokiData: {
    title: string;
    description: string;
    location: string;
    latitude?: number | null;
    longitude?: number | null;
    placeId?: string | null;
    timeSlot: string;
    category: string;
    maxAttendees: number | null;
    visibility: string;
    tags: string[];
    images?: Array<{ url?: string; publicId?: string; base64?: string; mimeType?: string }>;
    userLatitude?: number | null;
    userLongitude?: number | null;
    externalLink?: string | null;
    autoApprove?: boolean;
  }): Promise<Toki> {
    const response = await this.makeRequest<{ success: boolean; data: Toki }>('/tokis', {
      method: 'POST',
      body: JSON.stringify(tokiData),
    });
    return response.data;
  }

  async updateToki(id: string, updates: Partial<Toki>): Promise<Toki> {
    const response = await this.makeRequest<{ success: boolean; data: Toki }>(`/tokis/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  }

  // Invites
  async createInvite(tokiId: string, invitedUserId: string): Promise<{ success: boolean; data: any }> {
    return this.makeRequest(`/tokis/${tokiId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ invitedUserId }),
    });
  }

  async listInvites(tokiId: string): Promise<{ success: boolean; data: { invites: any[] } }> {
    return this.makeRequest(`/tokis/${tokiId}/invites`);
  }

  async respondToInvite(tokiId: string, inviteId: string, action: 'accept' | 'decline') {
    return this.makeRequest(`/tokis/${tokiId}/invites/${inviteId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  async respondToInviteViaNotification(notificationId: string, action: 'accept' | 'decline') {
    return this.makeRequest(`/tokis/invites/respond`, {
      method: 'POST',
      body: JSON.stringify({ notificationId, action }),
    });
  }

  // =========================
  // Invite Links (URL-based)
  // =========================
  async generateInviteLink(tokiId: string, opts?: { maxUses?: number | null; message?: string | null }): Promise<{ success: boolean; data: { id: string; inviteCode: string; inviteUrl: string; maxUses: number | null; usedCount: number; customMessage?: string | null; createdAt: string } }> {
    return this.makeRequest(`/tokis/${tokiId}/invite-links`, {
      method: 'POST',
      body: JSON.stringify({ maxUses: opts?.maxUses ?? null, message: opts?.message ?? null }),
    });
  }

  async regenerateInviteLink(tokiId: string, opts?: { maxUses?: number | null; message?: string | null }): Promise<{ success: boolean; data: { id: string; inviteCode: string; inviteUrl: string; maxUses: number | null; usedCount: number; customMessage?: string | null; createdAt: string } }> {
    return this.makeRequest(`/tokis/${tokiId}/invite-links/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ maxUses: opts?.maxUses ?? null, message: opts?.message ?? null }),
    });
  }

  async deactivateInviteLink(linkId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/tokis/invite-links/${linkId}`, { method: 'DELETE' });
  }

  async getInviteLinksForToki(tokiId: string): Promise<{ success: boolean; data: { toki: any; links: Array<{ id: string; inviteCode: string; inviteUrl: string; isActive: boolean; maxUses: number | null; usedCount: number; remainingUses: number | null; customMessage?: string | null; createdAt: string; updatedAt: string }>; activeLink?: any } }> {
    return this.makeRequest(`/tokis/${tokiId}/invite-links`);
  }

  async getInviteLinkInfo(code: string): Promise<{ success: boolean; data: { toki: any; host: any; inviteLink: any; isActive: boolean } }> {
    return this.makeRequest(`/tokis/invite-links/${code}`);
  }

  async joinByInviteCode(inviteCode: string): Promise<{ success: boolean; message: string; data?: any; error?: string }> {
    return this.makeRequest(`/tokis/join-by-link`, {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
  }

  // Hide (deny list)
  async hideUser(tokiId: string, userId: string) {
    return this.makeRequest(`/tokis/${tokiId}/hide`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async listHiddenUsers(tokiId: string) {
    return this.makeRequest(`/tokis/${tokiId}/hide`);
  }

  async unhideUser(tokiId: string, userId: string) {
    return this.makeRequest(`/tokis/${tokiId}/hide/${userId}`, { method: 'DELETE' });
  }

  async deleteToki(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.makeRequest(`/tokis/${id}`, { method: 'DELETE' });
      return { success: true };
    } catch (error) {
      console.error('Delete Toki error:', error);
      return { success: false, message: 'Failed to delete Toki' };
    }
  }

  async completeToki(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.makeRequest(`/tokis/${id}/complete`, { method: 'PUT' });
      return { success: true };
    } catch (error) {
      console.error('Complete Toki error:', error);
      return { success: false, message: 'Failed to complete Toki' };
    }
  }

  async joinToki(id: string): Promise<{ success: boolean; message: string; data: any }> {
    const response = await this.makeRequest<{ success: boolean; message: string; data: any }>(
      `/tokis/${id}/join`,
      { method: 'POST' }
    );
    return response;
  }

  async approveJoinRequest(tokiId: string, requestId: string): Promise<{ success: boolean; message: string; data: any }> {
    const response = await this.makeRequest<{ success: boolean; message: string; data: any }>(
      `/tokis/${tokiId}/join/${requestId}/approve`,
      { method: 'PUT' }
    );
    return response;
  }

  async declineJoinRequest(tokiId: string, requestId: string): Promise<{ success: boolean; message: string; data: any }> {
    const response = await this.makeRequest<{ success: boolean; message: string; data: any }>(
      `/tokis/${tokiId}/join/${requestId}/decline`,
      { method: 'PUT' }
    );
    return response;
  }

  async getJoinRequests(tokiId: string): Promise<{ success: boolean; data: { requests: any[] } }> {
    const response = await this.makeRequest<{ success: boolean; data: { requests: any[] } }>(
      `/tokis/${tokiId}/join-requests`
    );
    return response;
  }

  async removeParticipant(tokiId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.makeRequest<{ success: boolean; message: string }>(
      `/tokis/${tokiId}/participants/${userId}`,
      { method: 'DELETE' }
    );
    return response;
  }

  // Rating methods
  async submitRating(ratedUserId: string, tokiId: string, rating: number, reviewText?: string): Promise<boolean> {
    try {
      const response = await this.makeRequest('/ratings', {
        method: 'POST',
        body: JSON.stringify({ ratedUserId, tokiId, rating, reviewText })
      }) as any;
      return response.success;
    } catch (error) {
      console.error('Submit rating error:', error);
      return false;
    }
  }

  // Saved Tokis methods
  async getSavedTokis(): Promise<SavedToki[]> {
    try {
      const response = await this.makeRequest('/saved-tokis', { method: 'GET' }) as any;
      return response.data || [];
    } catch (error) {
      console.error('Get saved Tokis error:', error);
      return [];
    }
  }

  async saveToki(tokiId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/saved-tokis/${tokiId}`, { method: 'POST' }) as any;
      return response.success;
    } catch (error) {
      console.error('Save Toki error:', error);
      return false;
    }
  }

  async unsaveToki(tokiId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/saved-tokis/${tokiId}`, { method: 'DELETE' }) as any;
      return response.success;
    } catch (error) {
      console.error('Unsave Toki error:', error);
      return false;
    }
  }

  async checkIfSaved(tokiId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(`/saved-tokis/check/${tokiId}`, { method: 'GET' }) as any;
      return response.data?.isSaved || false;
    } catch (error) {
      console.error('Check saved status error:', error);
      return false;
    }
  }

  async getUserRatings(userId: string, page: number = 1, limit: number = 20): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      const response = await this.makeRequest(`/ratings/users/${userId}?page=${page}&limit=${limit}`, { method: 'GET' });
      return { success: true, data: response };
    } catch (error) {
      console.error('Get user ratings error:', error);
      return { success: false, message: 'Failed to get user ratings' };
    }
  }

  async getUserRatingStats(userId: string): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      const response = await this.makeRequest(`/ratings/users/${userId}/stats`, { method: 'GET' });
      return { success: true, data: response };
    } catch (error) {
      console.error('Get user rating stats error:', error);
      return { success: false, message: 'Failed to get user rating stats' };
    }
  }

  async updateRating(ratingId: string, rating: number, reviewText?: string): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      const response = await this.makeRequest(`/ratings/${ratingId}`, {
        method: 'PUT',
        body: JSON.stringify({ rating, reviewText })
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Update rating error:', error);
      return { success: false, message: 'Failed to update rating' };
    }
  }

  async deleteRating(ratingId: string): Promise<{ success: boolean; message?: string }> {
    try {
      await this.makeRequest(`/ratings/${ratingId}`, { method: 'DELETE' });
      return { success: true };
    } catch (error) {
      console.error('Delete rating error:', error);
      return { success: false, message: 'Failed to delete rating' };
    }
  }

  async checkRatingsForToki(tokiId: string): Promise<{ success: boolean; message?: string; data?: any }> {
    try {
      const response = await this.makeRequest(`/ratings/check/${tokiId}`, { method: 'GET' });
      return { success: true, data: response };
    } catch (error) {
      console.error('Check ratings error:', error);
      return { success: false, message: 'Failed to check ratings' };
    }
  }

  async uploadTokiImage(id: string, imageUri: string): Promise<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'toki-image.jpg',
    } as any);

    const response = await this.makeRequest<{ success: boolean; data: { imageUrl: string } }>(
      `/tokis/${id}/image`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      }
    );
    return response.data;
  }

  async getNearbyTokis(params: {
    latitude: number;
    longitude: number;
    radius?: number;
    limit?: number;
    page?: number;
    category?: string;
    timeSlot?: string;
  }): Promise<{ tokis: Toki[]; pagination: any; searchParams: any }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await this.makeRequest<{ 
      success: boolean; 
      data: { 
        tokis: Toki[]; 
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasMore: boolean;
        };
        searchParams: any 
      } 
    }>(
      `/tokis/nearby?${queryParams.toString()}`
    );
    return response.data;
  }

  async getCategories(): Promise<Category[]> {
    const response = await this.makeRequest<{ success: boolean; data: Category[] }>('/tokis/categories');
    return response.data;
  }

  // Waitlist
  async joinWaitlist(payload: { email: string; phone?: string | null; location?: string | null; reason?: string | null; platform?: string }) {
    return this.makeRequest(`/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async getPopularTags(limit?: number): Promise<PopularTag[]> {
    const queryParams = limit ? `?limit=${limit}` : '';
    const response = await this.makeRequest<{ success: boolean; data: PopularTag[] }>(`/tokis/tags/popular${queryParams}`);
    return response.data;
  }

  async searchTags(query: string, limit?: number): Promise<string[]> {
    const queryParams = new URLSearchParams({ q: query });
    if (limit) queryParams.append('limit', limit.toString());
    
    const response = await this.makeRequest<{ success: boolean; data: string[] }>(`/tokis/tags/search?${queryParams.toString()}`);
    return response.data;
  }

  // Connection Methods
  async getConnections(page?: number, limit?: number): Promise<{ connections: Connection[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());

    const response = await this.makeRequest<{ success: boolean; data: { connections: Connection[]; pagination: any } }>(
      `/connections?${queryParams.toString()}`
    );
    return response.data;
  }

  async getConnectionsForToki(tokiId: string): Promise<{ connections: any[]; toki: { id: string; title: string } }> {
    const response = await this.makeRequest<{ success: boolean; data: { connections: any[]; toki: { id: string; title: string } } }>(
      `/connections/for-toki/${tokiId}`
    );
    return response.data;
  }

  async getFriendsAttendingToki(tokiId: string): Promise<Array<{ id: string; name: string; avatar?: string }>> {
    const response = await this.makeRequest<{ success: boolean; data: Array<{ id: string; name: string; avatar?: string }> }>(
      `/tokis/${tokiId}/friends-attending`
    );
    return response.data;
  }

  async getPendingConnections(): Promise<PendingConnection[]> {
    const response = await this.makeRequest<{ success: boolean; data: PendingConnection[] }>('/connections/pending');
    return response.data;
  }

  async sendConnectionRequest(userId: string): Promise<{ id: string; createdAt: string; recipient: { id: string; name: string } }> {
    const response = await this.makeRequest<{ success: boolean; data: { id: string; createdAt: string; recipient: { id: string; name: string } } }>(
      `/connections/${userId}`,
      { method: 'POST' }
    );
    return response.data;
  }

  async respondToConnectionRequest(userId: string, action: 'accept' | 'decline'): Promise<{ id: string; status: string; updatedAt: string; requester: { id: string; name: string } }> {
    const response = await this.makeRequest<{ success: boolean; data: { id: string; status: string; updatedAt: string; requester: { id: string; name: string } } }>(
      `/connections/${userId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ action }),
      }
    );
    return response.data;
  }

  async removeConnection(userId: string): Promise<void> {
    await this.makeRequest(`/connections/${userId}`, { method: 'DELETE' });
  }

  // User Search
  async searchUsers(params?: {
    q?: string;
    page?: number;
    limit?: number;
    verified?: boolean;
    hasConnections?: boolean;
  }): Promise<{ users: User[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await this.makeRequest<{ success: boolean; data: { users: User[]; pagination: any } }>(
      `/auth/users/search?${queryParams.toString()}`
    );
    return response.data;
  }

  // Verification
  async verifyUser(userId: string, verified: boolean): Promise<{ id: string; name: string; verified: boolean; updatedAt: string }> {
    const response = await this.makeRequest<{ success: boolean; data: { id: string; name: string; verified: boolean; updatedAt: string } }>(
      `/auth/users/${userId}/verify`,
      {
        method: 'PUT',
        body: JSON.stringify({ verified }),
      }
    );
    return response.data;
  }

  // Health Check
  async healthCheck(): Promise<{ message: string; version: string; endpoints: any }> {
    const response = await this.makeRequest<{ message: string; version: string; endpoints: any }>('/health');
    return response;
  }

  // Public Profile Methods
  async getUserProfile(userId: string): Promise<any> {
    const response = await this.makeRequest<{ 
      success: boolean; 
      data: any 
    }>(`/auth/users/${userId}`);
    return response.data;
  }

  // Activity Visibility
  async getMyActivity(): Promise<any[]> {
    const response = await this.makeRequest<{ success: boolean; data: any[] }>(`/activity/me/activity`);
    return response.data;
  }

  async getUserActivity(userId: string): Promise<any[]> {
    const response = await this.makeRequest<{ success: boolean; data: any[] }>(`/activity/users/${userId}/activity`);
    return response.data;
  }

  async hideActivity(tokiId: string): Promise<void> {
    await this.makeRequest<{ success: boolean }>(`/activity/me/activity/${tokiId}/hide`, { method: 'POST' });
  }

  async showActivity(tokiId: string): Promise<void> {
    await this.makeRequest<{ success: boolean }>(`/activity/me/activity/${tokiId}/hide`, { method: 'DELETE' });
  }

  async getConnectionStatus(userId: string): Promise<{
    status: 'none' | 'pending' | 'accepted' | 'declined';
    isRequester: boolean;
    id?: string;
    createdAt?: string;
    updatedAt?: string;
  }> {
    const response = await this.makeRequest<{ 
      success: boolean; 
      data: {
        status: 'none' | 'pending' | 'accepted' | 'declined';
        isRequester: boolean;
        id?: string;
        createdAt?: string;
        updatedAt?: string;
      }
    }>(`/connections/status/${userId}`);
    return response.data;
  }



  async getMyRatings(page?: number, limit?: number): Promise<{ 
    ratings: UserRating[]; 
    pagination: any 
  }> {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());

    const response = await this.makeRequest<{ 
      success: boolean; 
      data: { 
        ratings: UserRating[]; 
        pagination: any 
      } 
    }>(`/ratings/my-ratings?${queryParams.toString()}`);
    return response.data;
  }

  // Blocking Methods
  async blockUser(userId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const response = await this.makeRequest<{ success: boolean; message: string }>(
      `/blocks/users/${userId}`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
    return response;
  }

  async unblockUser(userId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.makeRequest<{ success: boolean; message: string }>(
      `/blocks/users/${userId}`,
      { method: 'DELETE' }
    );
    return response;
  }

  async getBlockedUsers(page?: number, limit?: number): Promise<{ 
    blockedUsers: BlockedUser[]; 
    pagination: any 
  }> {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());

    const response = await this.makeRequest<{ 
      success: boolean; 
      data: { 
        blockedUsers: BlockedUser[]; 
        pagination: any 
      } 
    }>(`/blocks/blocked-users?${queryParams.toString()}`);
    return response.data;
  }

  async getBlockedByUsers(page?: number, limit?: number): Promise<{ 
    blockedBy: BlockedUser[]; 
    pagination: any 
  }> {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());

    const response = await this.makeRequest<{ 
      success: boolean; 
      data: { 
        blockedBy: BlockedUser[]; 
        pagination: any 
      } 
    }>(`/blocks/blocked-by?${queryParams.toString()}`);
    return response.data;
  }

  async checkBlockStatus(userId: string): Promise<BlockStatus> {
    const response = await this.makeRequest<{ 
      success: boolean; 
      data: BlockStatus 
    }>(`/blocks/check/${userId}`);
    return response.data;
  }

  // Messaging Methods
  async getConversations(page?: number, limit?: number): Promise<{ 
    conversations: Conversation[]; 
    pagination: any 
  }> {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());

    const response = await this.makeRequest<{ 
      success: boolean; 
      data: { 
        conversations: Conversation[]; 
        pagination: any 
      } 
    }>(`/messages/conversations?${queryParams.toString()}`);
    return response.data;
  }

  async startConversation(otherUserId: string): Promise<{ 
    conversationId: string; 
    message: string 
  }> {
    const response = await this.makeRequest<{ 
      success: boolean; 
      data: { 
        conversationId: string; 
        message: string 
      } 
    }>(`/messages/conversations`, {
      method: 'POST',
      body: JSON.stringify({ otherUserId }),
    });
    return response.data;
  }

  async getConversationMessages(conversationId: string, page?: number, limit?: number): Promise<{ 
    messages: Message[]; 
    pagination: any 
  }> {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());

    const response = await this.makeRequest<{ 
      success: boolean; 
      data: { 
        messages: Message[]; 
        pagination: any 
      } 
    }>(`/messages/conversations/${conversationId}/messages?${queryParams.toString()}`);
    return response.data;
  }

  async sendMessage(conversationId: string, content: string, messageType?: string, mediaUrl?: string): Promise<{ 
    messageId: string; 
    createdAt: string; 
    message: string 
  }> {
    const response = await this.makeRequest<{ 
      success: boolean; 
      data: { 
        messageId: string; 
        createdAt: string; 
        message: string 
      } 
    }>(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, messageType: messageType || 'text', mediaUrl }),
    });
    return response.data;
  }

  async getTokiMessages(tokiId: string, page?: number, limit?: number): Promise<{ 
    messages: Message[]; 
    pagination: any 
  }> {
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page.toString());
    if (limit) queryParams.append('limit', limit.toString());

    const response = await this.makeRequest<{ 
      success: boolean; 
      data: { 
        messages: Message[]; 
        pagination: any 
      } 
    }>(`/messages/tokis/${tokiId}/messages?${queryParams.toString()}`);
    return response.data;
  }

  async sendTokiMessage(tokiId: string, content: string, messageType?: string, mediaUrl?: string): Promise<{ 
    messageId: string; 
    createdAt: string; 
    message: string 
  }> {
    const response = await this.makeRequest<{ 
      success: boolean; 
      data: { 
        messageId: string; 
        createdAt: string; 
        message: string 
      } 
    }>(`/messages/tokis/${tokiId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, messageType: messageType || 'text', mediaUrl }),
    });
    return response.data;
  }

  async deleteMessage(messageId: string): Promise<{ 
    success: boolean; 
    message: string 
  }> {
    return this.makeRequest(`/messages/${messageId}`, {
      method: 'DELETE'
    });
  }

  async getTokiGroupChats(page?: number, limit?: number): Promise<{ 
    chats: any[]; 
    pagination: any 
  }> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const response = await this.makeRequest<{ 
      success: boolean; 
      data: { 
        chats: any[]; 
        pagination: any 
      } 
    }>(`/messages/tokis/group-chats?${params.toString()}`);
    return response.data;
  }

  // Utility Methods
  async isAuthenticated(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }
    
    // Check cache first
    if (this.authCache && Date.now() - this.authCache.timestamp < this.AUTH_CACHE_DURATION) {
      console.log('🔐 [API] Using cached authentication status.');
      return this.authCache.isValid;
    }

    // If we have fresh user cache, we're authenticated
    if (this.userCache && Date.now() - this.userCache.timestamp < this.USER_CACHE_DURATION) {
      console.log('🔐 [API] Using user cache to determine authentication status.');
      this.authCache = { isValid: true, timestamp: Date.now() };
      return true;
    }

    // Try to validate the token by making a test request with retry logic
    // We'll use getCurrentUser which has caching, so if auth succeeds we also cache user data
    const maxRetries = 2;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔐 [API] Authentication check attempt ${attempt}/${maxRetries}`);
        // Use getCurrentUser instead of a bare /auth/me call - this way we cache user data too
        await this.getCurrentUser(true); // Force refresh to validate token
        console.log('✅ [API] Authentication check successful');
        this.authCache = { isValid: true, timestamp: Date.now() };
        return true;
      } catch (error) {
        lastError = error;
        console.log(`❌ [API] Authentication check attempt ${attempt} failed:`, error);
        
        // If this is not the last attempt, wait a bit before retrying
        if (attempt < maxRetries) {
          console.log(`⏳ [API] Waiting before retry...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        }
      }
    }
    
    // All attempts failed - only clear tokens if it's a clear authentication error
    console.log('❌ [API] All authentication attempts failed');
    
    // Only clear tokens if it's a clear authentication error (401, 403)
    // Don't clear tokens for network errors or other issues
    if (lastError && typeof lastError === 'object' && lastError.message) {
      if (lastError.message.includes('Authentication failed') || 
          lastError.message.includes('Token expired') ||
          lastError.message.includes('Invalid token')) {
        console.log('🗑️ [API] Clearing tokens due to authentication error');
        await this.clearTokens();
        this.authCache = { isValid: false, timestamp: Date.now() }; // Invalidate cache on clear
      } else {
        console.log('⚠️ [API] Keeping tokens - error appears to be network-related');
      }
    }
    
    return false;
  }

  // Synchronous check for token existence (for backward compatibility)
  hasToken(): boolean {
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Clear authentication cache (useful for testing or forcing re-authentication)
  clearAuthCache(): void {
    console.log('🗑️ [API] Clearing authentication cache');
    this.authCache = null;
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Import AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
