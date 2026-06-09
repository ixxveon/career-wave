import axios from 'axios';
import { ADMIN_DETAIL_ROLE, type AdminDetailRole } from '../../constants/admin/adminRoleConstants';

export type ApiResponse<T> =
  | { success: true;  statusCode: number; message: string; data: T }
  | { success: false; statusCode: number; message: string; data: null };

export interface AdminLoginRequest {
  loginId: string;
  password: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  adminInfo: {
    id: string;
    name: string;
    role: AdminDetailRole;
  };
}

// XSS 방어를 위해 localStorage 대신 sessionStorage 사용
// 탭/브라우저 종료 시 자동 만료, JS로는 접근 가능하나 localStorage보다 노출 범위 제한
const ADMIN_TOKEN_KEY = 'career-wave.admin.accessToken';
const ADMIN_ROLE_KEY = 'career-wave.admin.role';
const ADMIN_ROLE_SET = new Set<AdminDetailRole>(Object.values(ADMIN_DETAIL_ROLE));

export const adminSession = {
  setToken(token: string) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
  },

  getToken() {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  },

  clearToken() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  setRole(role: AdminDetailRole) {
    sessionStorage.setItem(ADMIN_ROLE_KEY, role);
  },

  getRole() {
    const storedRole = sessionStorage.getItem(ADMIN_ROLE_KEY);
    if (!storedRole) return null;

    return ADMIN_ROLE_SET.has(storedRole as AdminDetailRole)
      ? (storedRole as AdminDetailRole)
      : null;
  },

  clearRole() {
    sessionStorage.removeItem(ADMIN_ROLE_KEY);
  },
};

// admin 전용 axios 인스턴스 — sessionStorage의 admin 토큰을 Authorization 헤더에 주입
const adminAxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

adminAxiosInstance.interceptors.request.use((config) => {
  const token = adminSession.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const ADMIN_AUTH_BASE_PATH = '/api/v1/admin/auth';

export const adminAuthApi = {
  login: (data: AdminLoginRequest) =>
    adminAxiosInstance.post<ApiResponse<AdminLoginResponse>>(`${ADMIN_AUTH_BASE_PATH}/login`, data),

  logout: () =>
    adminAxiosInstance.post<ApiResponse<null>>(`${ADMIN_AUTH_BASE_PATH}/logout`),
};
