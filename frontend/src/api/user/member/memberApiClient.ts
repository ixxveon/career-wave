/**
 * [Transport 경계]
 * user 도메인은 fetch를 사용한다. axios 인터셉터 대신 직접 retry/refresh 로직을
 * 구현하여 멱등성 여부(allowRetry)를 호출자가 명시적으로 제어할 수 있게 한다.
 * admin 도메인은 axiosInstance(utils/axiosInstance.ts)를 사용하며
 * 인터셉터로 인증 헤더 주입과 401 처리를 중앙화한다.
 */
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

async function fetchAccessTokenRefresh(): Promise<string | null> {
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

/**
 * refresh token 회전(rotation) + 재사용 탐지 백엔드와의 경쟁 조건 방지용 single-flight.
 * 새로고침(F5) 시 ProtectedRoute와 useAuth(Header)가 동시에 refresh를 호출하면,
 * 동일 refresh token으로 두 요청이 나가 한쪽이 회전시킨 뒤 다른 쪽이 구 토큰으로 도착 →
 * 재사용 탐지에 걸려 전체 세션이 폐기되고 로그아웃된다.
 * 진행 중인 요청이 있으면 그 Promise를 공유해 refresh 요청을 항상 1회로 합친다.
 */
let inflightRefresh: Promise<string | null> | null = null;

function requestAccessTokenRefresh(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = fetchAccessTokenRefresh().finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
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

/** HttpOnly cookie가 유효한지 확인한다. 새로고침 후 ProtectedRoute에서 사용. */
export async function probeAuth(): Promise<boolean> {
  const token = await requestAccessTokenRefresh();
  return token !== null;
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
