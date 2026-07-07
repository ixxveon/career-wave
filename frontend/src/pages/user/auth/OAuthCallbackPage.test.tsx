/** @vitest-environment jsdom */
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OAuthCallbackPage from './OAuthCallbackPage';

const navigateMock = vi.hoisted(() => vi.fn());
const searchParamsRef = vi.hoisted(() => ({ current: new URLSearchParams() }));
const probeAuthMock = vi.hoisted(() => vi.fn());
const authSessionMock = vi.hoisted(() => ({
  setTokens: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
  useSearchParams: () => [searchParamsRef.current] as const,
}));

vi.mock('../../../api/user/member/memberApiClient', () => ({
  probeAuth: probeAuthMock,
}));

vi.mock('../../../utils/user/member/authSession', () => ({
  authSession: authSessionMock,
}));

function setHandoffCookie(value: string | null) {
  if (value === null) {
    document.cookie = 'cw_oauth_login_token=; Max-Age=0; Path=/';
    return;
  }
  document.cookie = `cw_oauth_login_token=${value}; Path=/`;
}

beforeEach(() => {
  navigateMock.mockReset();
  probeAuthMock.mockReset();
  authSessionMock.setTokens.mockReset();
  searchParamsRef.current = new URLSearchParams({ type: 'login' });
  setHandoffCookie(null);
});

afterEach(() => {
  cleanup();
});

describe('OAuthCallbackPage (login)', () => {
  it('refresh 회전(probeAuth)이 끝난 뒤에야 홈으로 이동한다 — 회전 경쟁 창 제거 (#1025)', async () => {
    setHandoffCookie('handoff-token');

    let resolveProbe!: (ok: boolean) => void;
    probeAuthMock.mockReturnValue(new Promise<boolean>((resolve) => { resolveProbe = resolve; }));

    render(<OAuthCallbackPage />);

    // 토큰은 즉시 저장하되, 회전이 in-flight인 동안에는 navigate가 발생하면 안 된다.
    expect(authSessionMock.setTokens).toHaveBeenCalledWith({ accessToken: 'handoff-token' });
    await Promise.resolve();
    expect(navigateMock).not.toHaveBeenCalled();

    resolveProbe(true);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('probeAuth가 실패해도 회전 완료 후 홈으로 이동한다', async () => {
    setHandoffCookie('handoff-token');
    probeAuthMock.mockRejectedValue(new Error('refresh failed'));

    render(<OAuthCallbackPage />);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('handoff 토큰이 없으면 회전 없이 즉시 홈으로 이동한다', async () => {
    setHandoffCookie(null);

    render(<OAuthCallbackPage />);

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/', { replace: true });
    });
    expect(probeAuthMock).not.toHaveBeenCalled();
    expect(authSessionMock.setTokens).not.toHaveBeenCalled();
  });
});
