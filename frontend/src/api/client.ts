import axios from 'axios';
import { store } from '../store';
import { clearCredentials } from '../features/auth/authSlice';

const api = axios.create({ baseURL: '' });

api.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(clearCredentials());
    }
    return Promise.reject(error);
  }
);

export default api;
