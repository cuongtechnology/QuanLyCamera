import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Camera API
export const cameraAPI = {
  getAll: () => api.get('/cameras'),
  getById: (id) => api.get(`/cameras/${id}`),
  create: (data) => api.post('/cameras', data),
  update: (id, data) => api.put(`/cameras/${id}`, data),
  delete: (id) => api.delete(`/cameras/${id}`),
  test: (id) => api.post(`/cameras/${id}/test`),
};

// Stream API
export const streamAPI = {
  start: (cameraId, options = {}) => api.post(`/stream/start/${cameraId}`, options),
  stop: (cameraId) => api.post(`/stream/stop/${cameraId}`),
  startAll: () => api.post('/stream/start-all'),
  stopAll: () => api.post('/stream/stop-all'),
  getStatus: () => api.get('/stream/status'),
};

// PTZ API
export const ptzAPI = {
  move: (cameraId, direction, speed = 0.5) => 
    api.post(`/ptz/move/${cameraId}`, { direction, speed }),
  stop: (cameraId) => api.post(`/ptz/stop/${cameraId}`),
  getPresets: (cameraId) => api.get(`/ptz/presets/${cameraId}`),
  gotoPreset: (cameraId, presetToken) => 
    api.post(`/ptz/goto-preset/${cameraId}`, { presetToken }),
};

// Discovery API
export const discoveryAPI = {
  scan: (timeout = 5000) => api.post('/discovery/scan', { timeout }),
};

// Recording API
export const recordingAPI = {
  getAll: (params = {}) => api.get('/recordings', { params }),
  start: (cameraId) => api.post(`/recordings/start/${cameraId}`),
  stop: (cameraId) => api.post(`/recordings/stop/${cameraId}`),
  delete: (id) => api.delete(`/recordings/${id}`),
};

export default api;
