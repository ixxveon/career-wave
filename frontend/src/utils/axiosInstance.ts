// @admin-only — admin API 파일들만 import해서 사용한다. user 도메인에서 직접 import 금지.
import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { adminSession } from '../api/admin/adminSession';
import { requestAdminTokenRefresh } from './admin/adminTokenRefresh';
import { ADMIN_ROUTE_PATHS } from '../constants/admin/adminRouteConstants';

const ADMIN_AUTH_PREFIX = '/api/v1/admin/auth';

// 재시도 1회 제한 플래그. 인터셉터 재귀/무한 루프를 방지한다.
interface RetryableConfig extends InternalAxiosRequestConfig {
  _adminRetried?: boolean;
}

export function applyAdminAuthHeader(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const token = adminSession.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

/** 세션이 최종적으로 만료됐을 때만 호출: 토큰 정리 후 로그인 페이지로 이동. */
function forceAdminLogout(error: AxiosError): Promise<never> {
  adminSession.clearAll();
  if (typeof window !== 'undefined' && window.location.pathname !== ADMIN_ROUTE_PATHS.login) {
    window.location.assign(ADMIN_ROUTE_PATHS.login);
    // 리다이렉트 진행 중에는 후속 catch가 실행되지 않도록 영원히 pending인 Promise를 반환한다.
    return new Promise<never>(() => {});
  }
  // 이미 로그인 페이지(예: 자격증명 실패 401)면 에러를 전파해 로그인 폼이 실패 메시지를 표시하도록 한다.
  return Promise.reject(error);
}

// login/logout/refresh 자체는 refresh-retry 대상에서 제외한다(자격증명 실패를 세션만료로 오인 방지 + 재귀 차단).
function isAdminAuthEndpoint(url?: string): boolean {
  return !!url && url.includes(ADMIN_AUTH_PREFIX);
}

export async function handleAdminAuthError(error: AxiosError): Promise<AxiosResponse> {
  const status = error.response?.status;
  const config = error.config as RetryableConfig | undefined;

  if (status !== 401 || !config) {
    return Promise.reject(error);
  }

  // 인증 엔드포인트(login 등) 또는 이미 1회 재시도한 요청 → refresh 시도 없이 로그아웃 처리.
  if (isAdminAuthEndpoint(config.url) || config._adminRetried) {
    return forceAdminLogout(error);
  }

  // 401 → single-flight refresh 후 원요청 1회 재시도. 실패할 때만 로그아웃.
  config._adminRetried = true;
  const newToken = await requestAdminTokenRefresh();
  if (!newToken) {
    return forceAdminLogout(error);
  }

  config.headers.Authorization = `Bearer ${newToken}`;
  return axiosInstance.request(config);
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use(applyAdminAuthHeader);
axiosInstance.interceptors.response.use((response) => response, handleAdminAuthError);

export default axiosInstance;
