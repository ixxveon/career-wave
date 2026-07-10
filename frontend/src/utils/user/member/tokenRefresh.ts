import type { TokenRefreshResponse } from '../../../types/user/member';
import { authSession } from './authSession';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

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

let inflightRefresh: Promise<string | null> | null = null;

export function requestAccessTokenRefresh(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = fetchAccessTokenRefresh().finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
}
