import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';

const getBaseUrl = () => {
  if (!__DEV__) return 'https://backend-production-c924.up.railway.app/api';
  // Web runs in browser — use localhost directly
  if (Platform.OS === 'web') return 'http://localhost:5227/api';
  // Android emulator uses 10.0.2.2 to reach host machine
  if (Platform.OS === 'android') return 'http://10.0.2.2:5227/api';
  // iOS simulator uses localhost
  return 'http://localhost:5227/api';
};

const API_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
