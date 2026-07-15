// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./user/member/authSession', () => ({
  authSession: {
    getAccessToken: vi.fn(),
    setAccessToken: vi.fn(),
  },
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function loadApiClient(apiBaseUrl: string) {
  vi.resetModules();
  vi.stubEnv('VITE_API_BASE_URL', apiBaseUrl);
  return import('./apiClient');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('apiClient base URL', () => {
  it('prepends VITE_API_BASE_URL to relative endpoints', async () => {
    const { apiClient } = await loadApiClient('http://example.com');
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));

    await apiClient('/api/v1/user/job-notices');

    expect(fetch).toHaveBeenCalledWith(
      'http://example.com/api/v1/user/job-notices',
      expect.any(Object),
    );
  });

  it('keeps relative endpoints when VITE_API_BASE_URL is empty', async () => {
    const { apiClient } = await loadApiClient('');
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));

    await apiClient('/api/v1/user/job-notices');

    expect(fetch).toHaveBeenCalledWith('/api/v1/user/job-notices', expect.any(Object));
  });

  it('does not prepend VITE_API_BASE_URL to absolute endpoints', async () => {
    const { apiClient } = await loadApiClient('http://example.com');
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));

    await apiClient('https://example.com/api/v1/user/job-notices');

    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/api/v1/user/job-notices',
      expect.any(Object),
    );
  });
});

describe('apiClient optional auth', () => {
  it('attaches Authorization when an access token exists', async () => {
    const { apiClient } = await loadApiClient('http://example.com');
    const { authSession } = await import('./user/member/authSession');
    vi.mocked(authSession.getAccessToken).mockReturnValue('user-access-token');
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));

    await apiClient('/api/v1/user/job-notices', { auth: 'optional' });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers as HeadersInit);
    expect(headers.get('Authorization')).toBe('Bearer user-access-token');
  });

  it('requests public optional endpoints anonymously when token is missing', async () => {
    const { apiClient } = await loadApiClient('http://example.com');
    const { authSession } = await import('./user/member/authSession');
    vi.mocked(authSession.getAccessToken).mockReturnValue(null);
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ ok: true }));

    await apiClient('/api/v1/user/job-notices', { auth: 'optional' });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(new Headers(init?.headers as HeadersInit).get('Authorization')).toBeNull();
    expect(vi.mocked(authSession.setAccessToken)).not.toHaveBeenCalled();
  });

  it('does not refresh for concurrent anonymous optional requests', async () => {
    const { apiClient } = await loadApiClient('http://example.com');
    const { authSession } = await import('./user/member/authSession');
    vi.mocked(authSession.getAccessToken).mockReturnValue(null);
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));

    const first = apiClient('/api/v1/user/job-notices', { auth: 'optional' });
    const second = apiClient('/api/v1/user/job-notices/1', { auth: 'optional' });

    await Promise.all([first, second]);

    const refreshCalls = fetchSpy.mock.calls.filter(([input]) => String(input).includes('/token/refresh'));
    expect(refreshCalls).toHaveLength(0);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('falls back to anonymous retry when an optional auth token is rejected', async () => {
    const { apiClient } = await loadApiClient('http://example.com');
    const { authSession } = await import('./user/member/authSession');
    vi.mocked(authSession.getAccessToken).mockReturnValue('stale-token');
    vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiClient('/api/v1/user/job-notices', { auth: 'optional' });

    const [, init] = vi.mocked(fetch).mock.calls[2];
    const headers = new Headers(init?.headers as HeadersInit);
    expect(headers.get('Authorization')).toBeNull();
  });
});
