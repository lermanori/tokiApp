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
  maxAttendees: number;
  currentAttendees: number;
  category: string;
  visibility: 'public' | 'connections' | 'friends';
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
  joinStatus?: 'not_joined' | 'pending' | 'approved' | 'joined';
}

export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  location?: string;
  avatar?: string;
  verified: boolean;
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

  constructor() {
    // Initialize tokens synchronously - they will be loaded when needed
  }

  // Initialize the service - call this after the service is created
  async initialize() {
    await this.loadTokens();
  }

  private async loadTokens() {
    try {
      console.log('🔍 [API] Attempting to load stored tokens...');
      const tokens = await AsyncStorage.getItem('auth_tokens');
      console.log('🔍 [API] Raw tokens from storage:', tokens);
      
      if (tokens) {
        const { accessToken, refreshToken } = JSON.parse(tokens);
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        console.log('✅ [API] Tokens loaded successfully:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          accessTokenLength: accessToken?.length || 0
        });
      } else {
        console.log('⚠️ [API] No tokens found in storage');
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
      await AsyncStorage.removeItem('auth_tokens');
      
      // Verify tokens are cleared
      const remainingTokens = await AsyncStorage.getItem('auth_tokens');
      console.log('🔍 Tokens after clearing:', remainingTokens ? 'STILL EXIST' : 'CLEARED SUCCESSFULLY');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
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
      console.log(`🌐 [API] Making request to: ${endpoint}`);
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        console.log(`❌ [API] Request failed: ${response.status} ${response.statusText}`);
        
        if (response.status === 401 && this.refreshToken) {
          console.log('🔄 [API] Attempting token refresh...');
          // Try to refresh token
          const refreshed = await this.refreshAccessToken();
          if (refreshed) {
            console.log('✅ [API] Token refresh successful, retrying request...');
            // Retry the original request
            config.headers = this.getHeaders();
            const retryResponse = await fetch(url, config);
            const retryData = await retryResponse.json();
            
            if (!retryResponse.ok) {
              console.log(`❌ [API] Retry request failed: ${retryResponse.status}`);
              throw new Error(retryData.message || 'Request failed after token refresh');
            }
            return retryData;
          } else {
            console.log('❌ [API] Token refresh failed');
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

      console.log(`✅ [API] Request successful: ${endpoint}`);
      return data;
    } catch (error) {
      console.error(`❌ [API] Request failed for ${endpoint}:`, error);
      
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
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    await this.clearTokens();
    return false;
  }

  // Authentication Methods
  async register(userData: { name: string; email: string; password: string }): Promise<AuthResponse> {
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

    if (response.success) {
      await this.saveTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }

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
    await this.clearTokens();
  }

  async getCurrentUser(): Promise<{ user: User; socialLinks: any; stats: any; verified: boolean }> {
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
    
    return {
      user,
      stats,
      socialLinks,
      verified: user.verified
    };
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await this.makeRequest<{ success: boolean; data: User }>('/auth/me/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return response.data;
  }

  async getUserStats(): Promise<UserStats> {
    const response = await this.makeRequest<{ 
      success: boolean; 
      data: {
        user: User;
        socialLinks: any;
        stats: UserStats;
        verified: boolean;
      }
    }>('/auth/me');
    return response.data.stats;
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

  async getToki(id: string): Promise<Toki> {
    const response = await this.makeRequest<{ success: boolean; data: Toki }>(`/tokis/${id}`);
    return response.data;
  }

  async createToki(tokiData: {
    title: string;
    description: string;
    location: string;
    latitude?: number;
    longitude?: number;
    timeSlot: string;
    category: string;
    maxAttendees: number;
    visibility: string;
    tags: string[];
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
    category?: string;
    timeSlot?: string;
  }): Promise<{ tokis: Toki[]; searchParams: any }> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const response = await this.makeRequest<{ success: boolean; data: { tokis: Toki[]; searchParams: any } }>(
      `/tokis/nearby?${queryParams.toString()}`
    );
    return response.data;
  }

  async getCategories(): Promise<Category[]> {
    const response = await this.makeRequest<{ success: boolean; data: Category[] }>('/tokis/categories');
    return response.data;
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
    const response = await this.makeRequest<{ message: string; version: string; endpoints: any }>('');
    return response;
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

    // Try to validate the token by making a test request with retry logic
    const maxRetries = 2;
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔐 [API] Authentication check attempt ${attempt}/${maxRetries}`);
        await this.makeRequest<{ success: boolean }>('/auth/me');
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
