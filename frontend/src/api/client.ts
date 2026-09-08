import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('squadly_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || 'Something went wrong';
    return Promise.reject(new Error(msg));
  }
);

// Typed helpers
export const get = <T,>(url: string, params?: Record<string, unknown>) =>
  api.get(url, { params }).then((r) => r.data.data as T);

export const post = <T,>(url: string, body?: unknown) =>
  api.post(url, body).then((r) => r.data.data as T);

export const put = <T,>(url: string, body?: unknown) =>
  api.put(url, body).then((r) => r.data.data as T);
