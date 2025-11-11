// Admin API service
// Handles all API calls to the backend with JWT authentication

const API_BASE = '/api/admin';

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }
  const data = await response.json();
  return data;
};

export const adminApi = {
  // Waitlist
  getWaitlist: async (params?: { page?: number; limit?: number; location?: string; platform?: string }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    const response = await fetch(`${API_BASE}/waitlist?${query}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getWaitlistEntry: async (id: string) => {
    const response = await fetch(`${API_BASE}/waitlist/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getWaitlistStats: async () => {
    const response = await fetch(`${API_BASE}/waitlist/stats`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createUserFromWaitlist: async (waitlistId: string, userData: any) => {
    const response = await fetch(`${API_BASE}/waitlist/${waitlistId}/user`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  sendEmailToWaitlist: async (waitlistId: string, emailData: { subject: string; body: string }) => {
    const response = await fetch(`${API_BASE}/waitlist/${waitlistId}/email`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(emailData)
    });
    return handleResponse(response);
  },

  // Waitlist CRUD
  createWaitlistEntry: async (data: { email: string; phone?: string | null; location?: string | null; platform?: string | null }) => {
    const response = await fetch(`${API_BASE}/waitlist`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  updateWaitlistEntry: async (id: string, data: Partial<{ email: string; phone: string | null; location: string | null; platform: string | null }>) => {
    const response = await fetch(`${API_BASE}/waitlist/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  deleteWaitlistEntry: async (id: string) => {
    const response = await fetch(`${API_BASE}/waitlist/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Users
  getUsers: async (params?: { page?: number; limit?: number; search?: string; role?: string; verified?: boolean }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    const response = await fetch(`${API_BASE}/users?${query}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getUser: async (id: string) => {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createUser: async (userData: any) => {
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  updateUser: async (id: string, userData: any) => {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  deleteUser: async (id: string) => {
    const response = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Tokis
  getTokis: async (params?: { page?: number; limit?: number; search?: string; category?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) query.append(key, String(value));
      });
    }
    const response = await fetch(`${API_BASE}/tokis?${query}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getToki: async (id: string) => {
    const response = await fetch(`${API_BASE}/tokis/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getTokiParticipants: async (id: string) => {
    const response = await fetch(`${API_BASE}/tokis/${id}/participants`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createToki: async (tokiData: any) => {
    const response = await fetch(`${API_BASE}/tokis`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(tokiData)
    });
    return handleResponse(response);
  },

  updateToki: async (id: string, tokiData: any) => {
    const response = await fetch(`${API_BASE}/tokis/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(tokiData)
    });
    return handleResponse(response);
  },

  deleteToki: async (id: string) => {
    const response = await fetch(`${API_BASE}/tokis/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  // Algorithm Hyperparameters
  getAlgorithm: async () => {
    const response = await fetch(`${API_BASE}/algorithm`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  updateAlgorithm: async (weights: any) => {
    const response = await fetch(`${API_BASE}/algorithm`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(weights)
    });
    return handleResponse(response);
  },

  // Email Templates
  getEmailTemplates: async () => {
    const response = await fetch(`${API_BASE}/email-templates`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  getEmailTemplate: async (id: string) => {
    const response = await fetch(`${API_BASE}/email-templates/${id}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },

  createEmailTemplate: async (templateData: any) => {
    const response = await fetch(`${API_BASE}/email-templates`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(templateData)
    });
    return handleResponse(response);
  },

  updateEmailTemplate: async (id: string, templateData: any) => {
    const response = await fetch(`${API_BASE}/email-templates/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(templateData)
    });
    return handleResponse(response);
  },

  deleteEmailTemplate: async (id: string) => {
    const response = await fetch(`${API_BASE}/email-templates/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(response);
  },
};

