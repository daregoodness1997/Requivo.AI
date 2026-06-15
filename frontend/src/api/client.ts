import axios from 'axios';
import { env } from '@/config/env';

const client = axios.create({
  baseURL: env.apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

let handlingUnauthorized = false;

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('requivo_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !handlingUnauthorized &&
      window.location.pathname !== '/login'
    ) {
      handlingUnauthorized = true;
      localStorage.removeItem('requivo_token');
      localStorage.removeItem('requivo-auth');
      window.location.replace('/login');
    }
    return Promise.reject(error);
  },
);

export default client;
