import { authSession } from '../../utils/member/authSession';
import { toMemberApiError } from '../../utils/member/errorMapping';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface MemberApiOptions extends RequestInit {
  auth?: boolean;
}

export async function memberApiClient<T>(endpoint: string, options: MemberApiOptions = {}): Promise<T> {
  const { auth = false, headers, body, ...rest } = options;
  const isFormData = body instanceof FormData;
  const token = authSession.getAccessToken();
  const requestHeaders = new Headers(headers);

  if (!isFormData && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth && token) {
    requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...rest,
      body,
      headers: requestHeaders,
    });
  } catch (error) {
    if (auth) {
      authSession.clear();
    }
    throw toMemberApiError(0, {
      message: error instanceof Error ? error.message : undefined,
    });
  }

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json') ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401) {
      authSession.clear();
    }
    throw toMemberApiError(response.status, payload ?? undefined);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }

  return undefined as T;
}
