// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

vi.mock('../api/admin/adminSession', () => ({
  adminSession: {
    getToken: vi.fn(),
    clearAll: vi.fn(),
  },
}));

vi.mock('./admin/adminTokenRefresh', () => ({
  requestAdminTokenRefresh: vi.fn(),
}));

import { adminSession } from '../api/admin/adminSession';
import { requestAdminTokenRefresh } from './admin/adminTokenRefresh';
import axiosInstance, { applyAdminAuthHeader, handleAdminAuthError } from './axiosInstance';

beforeEach(() => {
  vi.clearAllMocks();
});

function makeConfig(overrides: Partial<InternalAxiosRequestConfig> = {}): InternalAxiosRequestConfig {
  return { headers: {}, url: '/api/v1/admin/dashboard', ...overrides } as InternalAxiosRequestConfig;
}

function make401(config?: InternalAxiosRequestConfig): AxiosError {
  return { response: { status: 401 }, config } as AxiosError;
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
// 401 응답 처리 (handleAdminAuthError) — refresh 후 재시도
// ─────────────────────────────────────────────
describe('handleAdminAuthError', () => {
  it('401 → refresh 성공 시 새 토큰으로 원요청을 재시도하고 세션을 유지한다', async () => {
    vi.mocked(requestAdminTokenRefresh).mockResolvedValue('new-token');
    const retryResponse = { data: 'ok' };
    const requestSpy = vi.spyOn(axiosInstance, 'request').mockResolvedValue(retryResponse as never);

    const config = makeConfig();
    const result = await handleAdminAuthError(make401(config));

    expect(requestAdminTokenRefresh).toHaveBeenCalledOnce();
    expect((config.headers as Record<string, string>).Authorization).toBe('Bearer new-token');
    expect(requestSpy).toHaveBeenCalledWith(config);
    expect(result).toBe(retryResponse);
    expect(adminSession.clearAll).not.toHaveBeenCalled();
    requestSpy.mockRestore();
  });

  it('401 → refresh 실패 시 세션을 정리하고 로그인으로 리다이렉트한다', async () => {
    const assignMock = vi.fn();
    vi.stubGlobal('window', { location: { pathname: '/cw-manage-2026/dashboard', assign: assignMock } });
    vi.mocked(requestAdminTokenRefresh).mockResolvedValue(null);

    // 리다이렉트 경로는 pending Promise를 반환하므로 내부 await 체인만 flush한 뒤 부수효과를 검증한다.
    handleAdminAuthError(make401(makeConfig()));
    await new Promise((resolve) => setTimeout(resolve));

    expect(requestAdminTokenRefresh).toHaveBeenCalledOnce();
    expect(adminSession.clearAll).toHaveBeenCalled();
    expect(assignMock).toHaveBeenCalledWith('/cw-manage-2026/login');
    vi.unstubAllGlobals();
  });

  it('이미 1회 재시도한 요청(_adminRetried)은 refresh 없이 바로 로그아웃한다', async () => {
    const assignMock = vi.fn();
    vi.stubGlobal('window', { location: { pathname: '/cw-manage-2026/dashboard', assign: assignMock } });

    // 재시도 요청 → 동기적으로 forceAdminLogout(리다이렉트, pending) 실행.
    handleAdminAuthError(make401(makeConfig({ _adminRetried: true } as Partial<InternalAxiosRequestConfig>)));

    expect(requestAdminTokenRefresh).not.toHaveBeenCalled();
    expect(adminSession.clearAll).toHaveBeenCalled();
    expect(assignMock).toHaveBeenCalledWith('/cw-manage-2026/login');
    vi.unstubAllGlobals();
  });

  it('login 등 auth 엔드포인트 401은 refresh 없이 에러를 전파하고, login 페이지면 리다이렉트하지 않는다', async () => {
    const assignMock = vi.fn();
    vi.stubGlobal('window', { location: { pathname: '/cw-manage-2026/login', assign: assignMock } });

    const config = makeConfig({ url: '/api/v1/admin/auth/login' });
    await expect(handleAdminAuthError(make401(config))).rejects.toBeDefined();

    expect(requestAdminTokenRefresh).not.toHaveBeenCalled();
    expect(adminSession.clearAll).toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('401이 아닌 에러는 세션을 정리하지 않고 에러를 전파한다', async () => {
    await expect(handleAdminAuthError({ response: { status: 403 }, config: makeConfig() } as AxiosError))
      .rejects.toBeDefined();
    expect(adminSession.clearAll).not.toHaveBeenCalled();
    expect(requestAdminTokenRefresh).not.toHaveBeenCalled();
  });
});
