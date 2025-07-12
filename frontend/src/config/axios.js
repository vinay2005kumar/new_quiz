import axios from 'axios';
import { config as appConfig } from './config'; // adjust path if needed

const api = axios.create({
  baseURL: appConfig.apiUrl,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials:true
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
  (response) => {
    return response.data || response;
  },
  (error) => {
    // Handle CORS errors specifically
    if (error.message === 'Network Error') {
      // Network error occurred
    }

    if (error.response?.status === 401) {
      // Only redirect to login for authenticated routes, not for login attempts
      const isLoginAttempt = error.config?.url?.includes('/login') ||
                            error.config?.url?.includes('/register') ||
                            error.config?.url?.includes('/event-quiz');

      if (!isLoginAttempt) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }

    if (error.response?.data?.message) {
      error.message = error.response.data.message;
    }

    return Promise.reject(error);
  }
);

export default api;
