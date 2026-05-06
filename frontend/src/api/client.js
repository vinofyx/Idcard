import axios from 'axios';

// In production (Vercel), VITE_API_URL points to Render backend
// In development, proxy handles /api → localhost:5000
const baseURL = (typeof __API_URL__ !== 'undefined' && __API_URL__)
  ? `${__API_URL__}/api`
  : '/api';

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
