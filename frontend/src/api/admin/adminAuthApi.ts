import axiosInstance from '../../utils/axiosInstance';
import { requestAdminTokenRefresh } from '../../utils/admin/adminTokenRefresh';
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

  /**
   * HttpOnly refresh 쿠키로 access token을 재발급한다(single-flight).
   * 성공 시 새 accessToken을, 실패 시 null을 반환하며 sessionStorage 세션도 함께 복원된다.
   * 인터셉터 재귀 방지를 위해 axiosInstance가 아닌 raw fetch로 동작한다.
   */
  refresh: () => requestAdminTokenRefresh(),
};
