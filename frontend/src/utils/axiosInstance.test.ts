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
import { applyAdminAuthHeader, handleAdminAuthError } from './axiosInstance';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeConfig(): InternalAxiosRequestConfig {
  return { headers: {} } as InternalAxiosRequestConfig;
}

// ─────────────────────────────────────────────
// Authorization 헤더 주입 (applyAdminAuthHeader)
// ─────────────────────────────────────────────
describe('applyAdminAuthHeader', () => {
  it('adminSession에 token이 있으면 Authorization 헤더를 주입한다', () => {
    vi.mocked(adminSession.getToken).mockReturnValue('admin-token');
    const config = applyAdminAuthHeader(makeConfig());
    expect((config.headers as Record<string, string>).Authorization).toBe('Bearer admin-token');
  });

  it('adminSession에 token이 없으면 Authorization 헤더를 주입하지 않는다', () => {
    vi.mocked(adminSession.getToken).mockReturnValue(null);
    const config = applyAdminAuthHeader(makeConfig());
    expect((config.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});

// ─────────────────────────────────────────────
// 401 응답 처리 (handleAdminAuthError)
// ─────────────────────────────────────────────
describe('handleAdminAuthError', () => {
  it('401 응답 시 adminSession을 정리한다', () => {
    const assignMock = vi.fn();
    vi.stubGlobal('window', { location: { pathname: '/admin/dashboard', assign: assignMock } });

    handleAdminAuthError({ response: { status: 401 } });

    expect(adminSession.clearToken).toHaveBeenCalled();
    expect(adminSession.clearRole).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('401 시 /admin/login으로 리다이렉트한다', () => {
    const assignMock = vi.fn();
    vi.stubGlobal('window', { location: { pathname: '/admin/dashboard', assign: assignMock } });

    handleAdminAuthError({ response: { status: 401 } });

    expect(assignMock).toHaveBeenCalledWith('/admin/login');
    vi.unstubAllGlobals();
  });

  it('이미 /admin/login이면 리다이렉트하지 않고 에러를 전파한다', async () => {
    const assignMock = vi.fn();
    vi.stubGlobal('window', { location: { pathname: '/admin/login', assign: assignMock } });

    await expect(handleAdminAuthError({ response: { status: 401 } })).rejects.toBeDefined();
    expect(assignMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('401이 아닌 에러는 세션을 정리하지 않고 에러를 전파한다', async () => {
    await expect(handleAdminAuthError({ response: { status: 403 } })).rejects.toBeDefined();
    expect(adminSession.clearToken).not.toHaveBeenCalled();
  });
});
