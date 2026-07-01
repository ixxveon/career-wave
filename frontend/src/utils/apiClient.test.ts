// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

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
