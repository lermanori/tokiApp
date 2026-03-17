const API_BASE = '/api/admin';

// Unified request helper with automatic token refresh
const makeRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('admin_token');

  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  // Only add Content-Type if not FormData and not already set
  if (!(options.body instanceof FormData) && !headers['Content-Type' as keyof HeadersInit]) {
    (headers as any)['Content-Type'] = 'application/json';
  }

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });

    // Handle 401 Unauthorized by attempting a token refresh
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('admin_refresh_token');
      if (refreshToken) {
        console.debug('🔄 [Admin API] Attempting token refresh...');
        try {
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          const refreshData = await refreshResponse.json();
          if (refreshResponse.ok && refreshData.success) {
            console.debug('✅ [Admin API] Token refresh successful');
            const { accessToken, refreshToken: newRefreshToken } = refreshData.data.tokens;
            localStorage.setItem('admin_token', accessToken);
            localStorage.setItem('admin_refresh_token', newRefreshToken);

            // Retry the original request with the new token
            const retryHeaders = {
              ...headers,
              'Authorization': `Bearer ${accessToken}`
            };
            const retryResponse = await fetch(url, { ...options, headers: retryHeaders });
            return await retryResponse.json();
          } else {
            // Only clear tokens if the server explicitly rejected the refresh token (401/403)
            if (refreshResponse.status === 401 || refreshResponse.status === 403) {
              console.warn('❌ [Admin API] Token refresh explicitly failed, clearing tokens');
              localStorage.removeItem('admin_token');
              localStorage.removeItem('admin_refresh_token');
              window.location.href = '/admin/login';
              throw new Error('Session expired');
            } else {
              console.warn(`⚠️ [Admin API] Token refresh failed with status ${refreshResponse.status}, keeping tokens`);
              throw new Error('Token refresh failed (server error)');
            }
          }
        } catch (refreshError) {
          // If it's a network error during refresh, don't clear tokens
          console.error('❌ [Admin API] Error during token refresh:', refreshError);
          // Check if this looks like a network error
          const isNetworkError = refreshError instanceof TypeError ||
            (refreshError instanceof Error &&
              (refreshError.message.includes('fetch') || refreshError.message.includes('Network')));

          if (!isNetworkError) {
            // If it's not a network error and we haven't handled it above, it might be safer to keep tokens 
            // but let the original error propagate.
          }
          throw refreshError;
        }
      } else {
        // No refresh token available - clear access token and redirect
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/login';
        throw new Error('Authentication required');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ [Admin API] Request failed for ${url}:`, error);
    throw error;
  }
};

export const adminApi = {
  // Settings
  getPasswordExpiry: async () => {
    return makeRequest('/settings/password-reset-expiry');
  },
  updatePasswordExpiry: async (hours: number) => {
    return makeRequest('/settings/password-reset-expiry', {
      method: 'PUT',
      body: JSON.stringify({ hours })
    });
  },

  // Waitlist
  getWaitlist: async (params?: { page?: number; limit?: number; location?: string; platform?: string }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return makeRequest(`/waitlist?${query}`);
  },

  getWaitlistEntry: async (id: string) => {
    return makeRequest(`/waitlist/${id}`);
  },

  getWaitlistStats: async () => {
    return makeRequest('/waitlist/stats');
  },

  createUserFromWaitlist: async (waitlistId: string, userData: any) => {
    return makeRequest(`/waitlist/${waitlistId}/user`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  sendEmailToWaitlist: async (waitlistId: string, emailData: { subject: string; body: string }) => {
    return makeRequest(`/waitlist/${waitlistId}/email`, {
      method: 'POST',
      body: JSON.stringify(emailData)
    });
  },

  // Waitlist CRUD
  createWaitlistEntry: async (data: { email: string; phone?: string | null; location?: string | null; platform?: string | null }) => {
    return makeRequest('/waitlist', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateWaitlistEntry: async (id: string, data: Partial<{ email: string; phone: string | null; location: string | null; platform: string | null }>) => {
    return makeRequest(`/waitlist/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteWaitlistEntry: async (id: string) => {
    return makeRequest(`/waitlist/${id}`, {
      method: 'DELETE'
    });
  },

  // Users
  getUsers: async (params?: { page?: number; limit?: number; search?: string; role?: string; verified?: boolean }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return makeRequest(`/users?${query}`);
  },

  getUser: async (id: string) => {
    return makeRequest(`/users/${id}`);
  },

  createUser: async (userData: any) => {
    return makeRequest('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  updateUser: async (id: string, userData: any) => {
    return makeRequest(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  deleteUser: async (id: string) => {
    return makeRequest(`/users/${id}`, {
      method: 'DELETE'
    });
  },
  issuePasswordLink: async (id: string, purpose: 'welcome' | 'reset', send: boolean, templateId?: string, includeLink: boolean = true) => {
    return makeRequest(`/users/${id}/password-link`, {
      method: 'POST',
      body: JSON.stringify({ purpose, send, templateId, includeLink })
    });
  },

  addInvitationCredits: async (userId: string, credits: number) => {
    return makeRequest(`/users/${userId}/invitation-credits`, {
      method: 'POST',
      body: JSON.stringify({ credits })
    });
  },

  // Tokis
  getTokis: async (params?: { page?: number; limit?: number; search?: string; category?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return makeRequest(`/tokis?${query}`);
  },

  getToki: async (id: string) => {
    return makeRequest(`/tokis/${id}`);
  },

  getTokiParticipants: async (id: string) => {
    return makeRequest(`/tokis/${id}/participants`);
  },

  createToki: async (tokiData: any) => {
    return makeRequest('/tokis', {
      method: 'POST',
      body: JSON.stringify(tokiData)
    });
  },

  updateToki: async (id: string, tokiData: any) => {
    return makeRequest(`/tokis/${id}`, {
      method: 'PUT',
      body: JSON.stringify(tokiData)
    });
  },

  deleteToki: async (id: string) => {
    return makeRequest(`/tokis/${id}`, {
      method: 'DELETE'
    });
  },

  // Batch upload
  previewBatchTokis: async (zipFile: File) => {
    const formData = new FormData();
    formData.append('zipFile', zipFile);
    return makeRequest('/tokis/batch/preview', {
      method: 'POST',
      body: formData
    });
  },

  createBatchTokis: async (zipFile: File) => {
    const formData = new FormData();
    formData.append('zipFile', zipFile);
    return makeRequest('/tokis/batch/create', {
      method: 'POST',
      body: formData
    });
  },

  // MCP API Keys
  getMcpKeys: async () => {
    return makeRequest('/mcp-keys');
  },

  createMcpKey: async (data: { name: string; scopes?: string[]; user_id: string }) => {
    return makeRequest('/mcp-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  revokeMcpKey: async (id: string) => {
    return makeRequest(`/mcp-keys/${id}/revoke`, {
      method: 'POST',
    });
  },

  // Algorithm Hyperparameters
  getAlgorithm: async () => {
    return makeRequest('/algorithm');
  },

  updateAlgorithm: async (weights: any) => {
    return makeRequest('/algorithm', {
      method: 'PUT',
      body: JSON.stringify(weights)
    });
  },

  // Email Templates
  getEmailTemplates: async () => {
    return makeRequest('/email-templates');
  },

  getEmailTemplate: async (id: string) => {
    return makeRequest(`/email-templates/${id}`);
  },

  createEmailTemplate: async (templateData: any) => {
    return makeRequest('/email-templates', {
      method: 'POST',
      body: JSON.stringify(templateData)
    });
  },

  updateEmailTemplate: async (id: string, templateData: any) => {
    return makeRequest(`/email-templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData)
    });
  },

  deleteEmailTemplate: async (id: string) => {
    return makeRequest(`/email-templates/${id}`, {
      method: 'DELETE'
    });
  },

  // Analytics
  getAnalytics: async (hours?: number) => {
    const query = new URLSearchParams();
    if (hours !== undefined) {
      query.append('hours', String(hours));
    }
    return makeRequest(`/analytics?${query}`);
  },
  getActiveUsers: async (params?: { limit?: number; days?: number }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return makeRequest(`/analytics/active-users?${query}`);
  },
  getUserActivity: async (userId: string, limit?: number) => {
    const query = new URLSearchParams();
    if (limit !== undefined) {
      query.append('limit', String(limit));
    }
    return makeRequest(`/analytics/user-activity/${userId}?${query}`);
  },

  // Notification Schedule
  getNotificationSchedule: async (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return makeRequest(`/notification-schedule?${query}`);
  },

  getNotificationScheduleEntry: async (id: string) => {
    return makeRequest(`/notification-schedule/${id}`);
  },

  createNotificationSchedule: async (data: {
    title: string;
    message: string;
    day_of_week: number;
    hour: number;
    minute: number;
    enabled?: boolean;
  }) => {
    return makeRequest('/notification-schedule', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateNotificationSchedule: async (id: string, data: {
    title?: string;
    message?: string;
    day_of_week?: number;
    hour?: number;
    minute?: number;
    enabled?: boolean;
  }) => {
    return makeRequest(`/notification-schedule/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteNotificationSchedule: async (id: string) => {
    return makeRequest(`/notification-schedule/${id}`, {
      method: 'DELETE'
    });
  },

  testNotificationSchedule: async (id: string) => {
    return makeRequest(`/notification-schedule/${id}/test`, {
      method: 'POST'
    });
  },

  // Reports
  getReports: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    contentType?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    return makeRequest(`/reports?${query}`);
  },

  updateReport: async (reportId: string, data: { status: string; notes?: string }) => {
    return makeRequest(`/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // Block/Unblock Toki
  blockToki: async (tokiId: string, data: { block: boolean; reason?: string }) => {
    return makeRequest(`/tokis/${tokiId}/block`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // Token Debug
  getTokenDebug: async (userId: string) => {
    return makeRequest(`/token-debug/${userId}`);
  },

  // Auth check
  me: async () => {
    return makeRequest('/me');
  }
};

