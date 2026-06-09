// @admin-only — admin API 파일들만 import해서 사용한다. user 도메인에서 직접 import 금지.
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { adminSession } from '../admin/api/adminAuthApi';

export function applyAdminAuthHeader(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = adminSession.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

export function handleAdminAuthError(error: { response?: { status?: number } }): Promise<never> | Promise<void> {
  if (error.response?.status === 401) {
    adminSession.clearToken();
    adminSession.clearRole();
    if (typeof window !== 'undefined' && window.location.pathname !== '/admin/login') {
      window.location.assign('/admin/login');
      return new Promise(() => {});
    }
  }
  return Promise.reject(error);
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(applyAdminAuthHeader);
axiosInstance.interceptors.response.use((response) => response, handleAdminAuthError);

export default axiosInstance;
