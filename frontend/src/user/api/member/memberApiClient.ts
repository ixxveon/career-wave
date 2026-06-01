import type { ApiResponse } from '../../types/member';
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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...rest,
    body,
    headers: requestHeaders,
  });

  const contentType = response.headers.get('content-type');
  const payload = contentType?.includes('application/json') ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401) {
      authSession.clear();
    }
    throw toMemberApiError(response.status, payload ?? undefined);
  }

  return (payload as ApiResponse<T>).data;
}
