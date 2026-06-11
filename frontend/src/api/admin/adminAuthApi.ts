import axiosInstance from '../../utils/axiosInstance';
import type { AdminDetailRole } from '../../constants/admin/adminRoleConstants';

export { adminSession } from './adminSession';

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

const ADMIN_AUTH_BASE_PATH = '/api/v1/admin/auth';

export const adminAuthApi = {
  login: (data: AdminLoginRequest) =>
    axiosInstance.post<ApiResponse<AdminLoginResponse>>(`${ADMIN_AUTH_BASE_PATH}/login`, data),

  logout: () =>
    axiosInstance.post<ApiResponse<null>>(`${ADMIN_AUTH_BASE_PATH}/logout`),
};
