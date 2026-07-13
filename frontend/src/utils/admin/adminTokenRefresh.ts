// @admin-only — 관리자 도메인 전용 access token 재발급.
// 사용자 쪽 utils/user/member/tokenRefresh.ts 와 동일한 single-flight 패턴을 따른다.
// axiosInstance(인터셉터)를 거치지 않는 raw fetch로 구현해 401 인터셉터와의 재귀를 방지한다.
import { adminSession } from '../../api/admin/adminSession';
import { ADMIN_DETAIL_ROLE, type AdminDetailRole } from '../../constants/admin/adminRoleConstants';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const ADMIN_REFRESH_URL = '/api/v1/admin/auth/refresh';

const ADMIN_ROLE_SET = new Set<AdminDetailRole>(Object.values(ADMIN_DETAIL_ROLE));

interface AdminRefreshData {
  accessToken: string;
  adminInfo?: {
    id: number | string;
    name: string;
    role: string;
  };
}

/** refresh 응답의 adminInfo로 sessionStorage 세션을 복원한다(탭 재오픈 등 부재 상황 대비). */
function restoreAdminSession(data: AdminRefreshData) {
  adminSession.setToken(data.accessToken);

  const info = data.adminInfo;
  if (!info) return;

  if (info.role && ADMIN_ROLE_SET.has(info.role as AdminDetailRole)) {
    adminSession.setRole(info.role as AdminDetailRole);
  }
  if (info.id != null) adminSession.setId(String(info.id));
  if (info.name) adminSession.setName(info.name);
}

async function fetchAdminTokenRefresh(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${ADMIN_REFRESH_URL}`, {
      method: 'POST',
      credentials: 'include',
    });

    const contentType = response.headers.get('content-type');
    const payload = contentType?.includes('application/json')
      ? await response.json().catch(() => null)
      : null;

    if (!response.ok) return null;

    const data = (payload && typeof payload === 'object' && 'data' in payload
      ? payload.data
      : payload) as AdminRefreshData | null;

    if (!data?.accessToken) return null;

    restoreAdminSession(data);
    return data.accessToken;
  } catch {
    return null;
  }
}

let inflightRefresh: Promise<string | null> | null = null;

/** 동시 다발 401을 단일 refresh 요청으로 합류(single-flight)시킨다. */
export function requestAdminTokenRefresh(): Promise<string | null> {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = fetchAdminTokenRefresh().finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
}

/** HttpOnly refresh 쿠키가 유효한지 확인한다. 새로고침/탭 재오픈 후 AdminProtectedRoute에서 사용. */
export async function probeAdminAuth(): Promise<boolean> {
  const token = await requestAdminTokenRefresh();
  return token !== null;
}
