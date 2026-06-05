import { authSession } from '../../utils/member/authSession';
import { toMemberApiError } from '../../utils/member/errorMapping';
import type { TokenRefreshResponse } from '../../types/member';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface MemberApiOptions extends RequestInit {
  auth?: boolean;
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
  const refreshToken = authSession.getRefreshToken();
  const headers = new Headers({ 'Content-Type': 'application/json' });

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/members/token/refresh`, {
      method: 'POST',
      headers,
      body: refreshToken ? JSON.stringify({ refreshToken }) : undefined,
      credentials: 'include',
    });

    const contentType = response.headers.get('content-type');
    const payload = contentType?.includes('application/json') ? await response.json().catch(() => null) : null;

    if (!response.ok) return null;

    const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
    const tokenData = data as TokenRefreshResponse | null;

    if (!tokenData?.accessToken) return null;

    authSession.setTokens({
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken ?? refreshToken ?? undefined,
    });

    return tokenData.accessToken;
  } catch {
    return null;
  }
}

async function requestWithAuthRetry(endpoint: string, init: RequestInit, auth: boolean): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, init);

  if (!auth || response.status !== 401) return response;

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
  const { auth = false, headers, body, ...rest } = options;
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
    }, auth);
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
