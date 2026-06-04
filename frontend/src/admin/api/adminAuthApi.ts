import axiosInstance from '../../utils/axiosInstance';

interface ApiResponse<T> {
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
    axiosInstance.post(`${ADMIN_AUTH_BASE_PATH}/logout`),
};

export const adminSession = {
  setToken(token: string) {
    localStorage.setItem('accessToken', token);
  },

  getToken() {
    return localStorage.getItem('accessToken');
  },

  clearToken() {
    localStorage.removeItem('accessToken');
  },
};
