// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { memberApiClient } from './memberApiClient';
import { authSession } from '../../utils/member/authSession';

vi.mock('../../utils/member/authSession', () => ({
  authSession: {
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setTokens: vi.fn(),
    clear: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authSession.getAccessToken).mockReturnValue('valid-token');
  vi.mocked(authSession.getRefreshToken).mockReturnValue('valid-refresh');
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// ─────────────────────────────────────────────
// GET 401 → refresh 후 1회 retry
// ─────────────────────────────────────────────
describe('GET 요청 — 401 시 refresh 후 retry', () => {
  it('401 응답 시 token refresh 후 재요청하고 성공 응답을 반환한다', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ data: { accessToken: 'new-token' } }))
      .mockResolvedValueOnce(jsonResponse({ data: { ok: true } }));

    const result = await memberApiClient('/api/test', { method: 'GET', auth: true });

    expect(result).toEqual({ ok: true });
    expect(vi.mocked(authSession.setTokens)).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'new-token' }),
    );
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

// ─────────────────────────────────────────────
// POST 401 → replay 하지 않음 (기본)
// ─────────────────────────────────────────────
describe('POST 요청 — 401 시 기본적으로 replay 안 함', () => {
  it('POST 401 응답 시 refresh 없이 에러를 던진다', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));

    await expect(
      memberApiClient('/api/test', { method: 'POST', auth: true }),
    ).rejects.toMatchObject({ statusCode: 401 });

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────
// POST + allowRetry → retry 허용
// ─────────────────────────────────────────────
describe('POST 요청 — allowRetry: true 시 retry 허용', () => {
  it('allowRetry: true면 POST 401에서도 refresh 후 재요청한다', async () => {
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ data: { accessToken: 'new-token' } }))
      .mockResolvedValueOnce(jsonResponse({ data: { created: true } }));

    const result = await memberApiClient('/api/test', {
      method: 'POST',
      auth: true,
      allowRetry: true,
    });

    expect(result).toEqual({ created: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
