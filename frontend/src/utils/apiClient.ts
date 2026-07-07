import { authSession } from './user/member/authSession';

interface ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
}

interface ApiClientOptions extends RequestInit {
  auth?: 'optional';
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

function buildApiUrl(endpoint: string): string {
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  return `${API_BASE_URL}${endpoint}`;
}

async function refreshOptionalAccessToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/user/members/token/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    const contentType = response.headers.get('content-type');
    const payload = contentType?.includes('application/json') ? await response.json().catch(() => null) : null;

    if (!response.ok) return null;

    const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
    const accessToken =
      data && typeof data === 'object' && 'accessToken' in data && typeof data.accessToken === 'string'
        ? data.accessToken
        : null;

    if (!accessToken) return null;

    authSession.setAccessToken(accessToken);
    return accessToken;
  } catch {
    return null;
  }
}

function createRequestHeaders(options: ApiClientOptions, isFormData: boolean) {
  const headers = new Headers(options.headers);

  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

function buildRequestInit(options: RequestInit, headers: Headers): RequestInit {
  return {
    ...options,
    headers,
  };
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: ApiClientOptions = {},
): Promise<T | null> {
  const { auth, ...requestInit } = options;
  const isFormData = requestInit.body instanceof FormData;
  const url = buildApiUrl(endpoint);
  const requestHeaders = createRequestHeaders(requestInit, isFormData);

  const accessToken = auth === 'optional'
    ? authSession.getAccessToken() ?? await refreshOptionalAccessToken()
    : null;

  if (accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`);
  }

  let response = await fetch(url, buildRequestInit(requestInit, requestHeaders));

  if (response.status === 401 && auth === 'optional') {
    const refreshedToken = await refreshOptionalAccessToken();

    if (refreshedToken) {
      const retryHeaders = new Headers(requestHeaders);
      retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
      response = await fetch(url, buildRequestInit(requestInit, retryHeaders));
    } else if (requestHeaders.has('Authorization')) {
      const anonymousHeaders = new Headers(requestHeaders);
      anonymousHeaders.delete('Authorization');
      response = await fetch(url, buildRequestInit(requestInit, anonymousHeaders));
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.message || `요청 실패 (${response.status})`;
    const error = new Error(message) as ApiError;
    error.status = response.status;
    error.body = errorBody;
    throw error;
  }

  const contentType = response.headers.get('content-type');
  const contentLength = response.headers.get('content-length');
  if (
    response.status === 204 ||
    contentLength === '0' ||
    !contentType?.includes('application/json')
  ) {
    return null;
  }

  return response.json() as Promise<T>;
}
