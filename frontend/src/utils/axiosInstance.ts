// @admin-only — admin API 파일들만 import해서 사용한다. user 도메인에서 직접 import 금지.
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { adminSession } from '../api/admin/adminSession';
import { ADMIN_ROUTE_PATHS } from '../constants/admin/adminRouteConstants';

export function applyAdminAuthHeader(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = adminSession.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

export function handleAdminAuthError(error: { response?: { status?: number } }): Promise<never> | Promise<void> {
  if (error.response?.status === 401) {
    adminSession.clearAll();
    if (typeof window !== 'undefined' && window.location.pathname !== ADMIN_ROUTE_PATHS.login) {
      window.location.assign(ADMIN_ROUTE_PATHS.login);
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
