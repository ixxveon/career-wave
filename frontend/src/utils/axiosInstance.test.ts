// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type InternalAxiosRequestConfig } from 'axios';

vi.mock('../admin/api/adminAuthApi', () => ({
  adminSession: {
    getToken: vi.fn(),
    clearToken: vi.fn(),
    clearRole: vi.fn(),
  },
}));

import { adminSession } from '../admin/api/adminAuthApi';

function applyRequestInterceptor(token: string | null): InternalAxiosRequestConfig {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  if (token) (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  return config;
}

function applyResponseErrorInterceptor(status: number) {
  if (status === 401) {
    adminSession.clearToken();
    adminSession.clearRole();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────
// Authorization 헤더 주입
// ─────────────────────────────────────────────
describe('Authorization 헤더 주입', () => {
  it('adminSession에 token이 있으면 Authorization 헤더를 주입한다', () => {
    vi.mocked(adminSession.getToken).mockReturnValue('admin-token');
    const config = applyRequestInterceptor(adminSession.getToken());
    expect((config.headers as Record<string, string>).Authorization).toBe('Bearer admin-token');
  });

  it('adminSession에 token이 없으면 Authorization 헤더를 주입하지 않는다', () => {
    vi.mocked(adminSession.getToken).mockReturnValue(null);
    const config = applyRequestInterceptor(adminSession.getToken());
    expect((config.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// 401 세션 정리
// ─────────────────────────────────────────────
describe('401 응답 처리', () => {
  it('401 응답 시 adminSession.clearToken과 clearRole을 호출한다', () => {
    applyResponseErrorInterceptor(401);
    expect(adminSession.clearToken).toHaveBeenCalled();
    expect(adminSession.clearRole).toHaveBeenCalled();
  });

  it('401이 아닌 에러는 세션을 정리하지 않는다', () => {
    applyResponseErrorInterceptor(403);
    expect(adminSession.clearToken).not.toHaveBeenCalled();
    expect(adminSession.clearRole).not.toHaveBeenCalled();
  });
});
