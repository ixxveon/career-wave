import axiosInstance from '../../utils/axiosInstance';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface AdminLoginRequest {
  loginId: string;
  password: string;
}

export interface AdminLoginResponse {
  accessToken: string;
  adminInfo: {
    id: string;
    name: string;
    role: 'MASTER' | 'CS' | 'BACKEND';
  };
}

const ADMIN_AUTH_BASE_PATH = '/api/v1/admin/auth';

export const adminAuthApi = {
  login: (data: AdminLoginRequest) =>
    axiosInstance.post<ApiResponse<AdminLoginResponse>>(`${ADMIN_AUTH_BASE_PATH}/login`, data),

  logout: () =>
    axiosInstance.post<ApiResponse<null>>(`${ADMIN_AUTH_BASE_PATH}/logout`),
};

// XSS 방어를 위해 localStorage 대신 sessionStorage 사용
// 탭/브라우저 종료 시 자동 만료, JS로는 접근 가능하나 localStorage보다 노출 범위 제한
const ADMIN_TOKEN_KEY = 'career-wave.admin.accessToken';

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
};
