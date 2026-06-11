import { authSession } from '../../../utils/user/member/authSession';
import { toMemberApiError } from '../../../utils/user/member/errorMapping';
import type { TokenRefreshResponse } from '../../../types/user/member';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isSafeMethod(method: string | undefined): boolean {
  return SAFE_METHODS.has((method ?? 'GET').toUpperCase());
}

export interface MemberApiOptions extends RequestInit {
  auth?: boolean;
  /**
   * true로 설정하면 POST/PUT/PATCH/DELETE 요청도 401 후 1회 재시도를 허용한다.
   * 호출자가 해당 endpoint의 멱등성(idempotency)을 직접 보장해야 한다.
   * 주문 생성 등 멱등성이 없는 요청에 사용 시 중복 실행 위험이 있다.
   */
  allowRetry?: boolean;
}

function redirectToLoginOnSessionExpired() {
  if (typeof window === 'undefined') return;

  const { pathname, search } = window.location;
  if (pathname === '/auth/login') return;

  const currentPath = `${pathname}${search}`;
  const next = currentPath && currentPath !== '/' ? `?next=${encodeURIComponent(currentPath)}` : '';
  window.location.assign(`/auth/login${next}`);
}

async function requestAccessTokenRefresh(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/user/members/token/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    const contentType = response.headers.get('content-type');
    const payload = contentType?.includes('application/json') ? await response.json().catch(() => null) : null;

    if (!response.ok) return null;

    const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
    const tokenData = data as TokenRefreshResponse | null;

    if (!tokenData?.accessToken) return null;

    authSession.setAccessToken(tokenData.accessToken);

    return tokenData.accessToken;
  } catch {
    return null;
  }
}

async function requestWithAuthRetry(endpoint: string, init: RequestInit, auth: boolean, allowRetry = false): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, init);

  if (!auth || response.status !== 401) return response;
  if (!isSafeMethod(init.method) && !allowRetry) return response;

  const refreshedToken = await requestAccessTokenRefresh();
  if (!refreshedToken) return response;

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);

  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...init,
    headers: retryHeaders,
  });
}

export async function memberApiClient<T>(endpoint: string, options: MemberApiOptions = {}): Promise<T> {
  const { auth = false, allowRetry = false, headers, body, ...rest } = options;
  const isFormData = body instanceof FormData;
  let token = authSession.getAccessToken();
  const requestHeaders = new Headers(headers);

  if (!isFormData && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth && !token) {
    token = await requestAccessTokenRefresh();
  }

  if (auth && !token) {
    authSession.clear();
    throw toMemberApiError(401, {
      message: '인증 정보가 없습니다.',
    });
  }

  if (auth) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await requestWithAuthRetry(endpoint, {
      ...rest,
      body,
      headers: requestHeaders,
    }, auth, allowRetry);
  } catch (error) {
    // 네트워크 단절/timeout 등 fetch 자체 실패는 세션과 무관하므로 세션을 유지한다.
    throw toMemberApiError(0, {
      message: error instanceof Error ? error.message : undefined,
    });
  }

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json') ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401) {
      authSession.clear();
      if (auth) redirectToLoginOnSessionExpired();
    }
    throw toMemberApiError(response.status, payload ?? undefined);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }

  return undefined as T;
}
