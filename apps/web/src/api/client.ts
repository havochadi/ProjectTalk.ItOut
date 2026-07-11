import axios from 'axios';

// An empty base URL keeps browser requests on the frontend origin. During local
// development (and secure-tunnel demos), Vite proxies them to the API.
const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    const isAuthEndpoint = typeof requestUrl === 'string' && requestUrl.startsWith('/auth/');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
};

// User API
export const userAPI = {
  getMe: () => api.get('/users/me'),
  updateProfile: (data: any) => api.patch('/users/me', data),
  addGoal: (data: any) => api.post('/users/me/goals', data),
  getUsers: (params?: any) => api.get('/users', { params }),
};

// Task API
export const taskAPI = {
  create: (data: any) => api.post('/tasks', data),
  getAll: (params?: any) => api.get('/tasks', { params }),
  get: (id: string) => api.get(`/tasks/${id}`),
  update: (id: string, data: any) => api.patch(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
  updateStatus: (id: string, status: string) => api.patch(`/tasks/${id}/status`, { status }),
  getStudySuggestions: (id: string) => api.get(`/tasks/${id}/study-suggestions`),
  getSummary: () => api.get('/tasks/summary'),
};

// Chat API
export const chatAPI = {
  sendMessage: (text: string) => api.post('/chat/message', { text }),
  getHistory: (params?: any) => api.get('/chat/history', { params }),
  clearHistory: () => api.delete('/chat/history'),
};

// Check-in API
export const checkInAPI = {
  create: (data: any) => api.post('/checkins', data),
  getMine: (params?: any) => api.get('/checkins/me', { params }),
  getStats: () => api.get('/checkins/stats'),
};

// Pomodoro API
export const pomodoroAPI = {
  start: () => api.post('/pomodoro/start'),
  stop: (cyclesCompleted: number) => api.post('/pomodoro/stop', { cyclesCompleted }),
  getState: () => api.get('/pomodoro/state'),
  getHistory: (params?: any) => api.get('/pomodoro/history', { params }),
};

// Risk API (counselor only)
export const riskAPI = {
  getFlags: (params?: any) => api.get('/risk/flags', { params }),
  getFlag: (id: string) => api.get(`/risk/flags/${id}`),
  updateFlag: (id: string, data: any) => api.patch(`/risk/flags/${id}`, data),
  deleteFlag: (id: string) => api.delete(`/risk/flags/${id}`),
};

// Metrics API (counselor/admin)
export const metricsAPI = {
  getAggregate: (params?: any) => api.get('/metrics/aggregate', { params }),
  getUserMetrics: (userId: string, params?: any) => api.get(`/metrics/user/${userId}`, { params }),
};

// Privacy API
export const privacyAPI = {
  exportData: () => api.get('/privacy/export'),
  deleteAccount: () => api.post('/privacy/delete', { confirmation: 'DELETE' }),
};

// Admin API
export const adminAPI = {
  getHealth: () => api.get('/admin/health'),
  getConfig: () => api.get('/admin/config/public'),
  getStats: () => api.get('/admin/stats'),
};

// Counselor Messages API
export const counselorMessagesAPI = {
  // Counselor: Send message to student
  sendMessage: (toUserId: string, text: string) =>
    api.post('/counselor-messages', { toUserId, text }),
  // Counselor: Get sent messages
  getSentMessages: (toUserId?: string) =>
    api.get('/counselor-messages/sent', { params: toUserId ? { toUserId } : {} }),
  // Student: Get received messages
  getReceivedMessages: () =>
    api.get('/counselor-messages/received'),
  // Student: Mark message as read
  markAsRead: (id: string) =>
    api.patch(`/counselor-messages/${id}/read`),
  // Get unread count
  getUnreadCount: () =>
    api.get('/counselor-messages/unread-count'),
  // Student: Reply to a message
  replyToMessage: (messageId: string, text: string) =>
    api.post(`/counselor-messages/${messageId}/reply`, { text }),
  // Get conversation thread
  getThread: (messageId: string) =>
    api.get(`/counselor-messages/${messageId}/thread`),
};
