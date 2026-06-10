// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSpringWebSocket } from './useSpringWebSocket';
import { useFastApiWebSocket } from './useFastApiWebSocket';
import { usePreflightCheck } from './usePreflightCheck';

vi.mock('../../../utils/user/member/authSession', () => ({
  authSession: { getAccessToken: vi.fn() },
}));

import { authSession } from '../../../utils/user/member/authSession';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;
  url: string;
  readyState = 3; // CLOSED — wsRef가 없을 때 guard를 통과하도록
  onopen:    (() => void) | null = null;
  onerror:   (() => void) | null = null;
  onclose:   ((e: CloseEvent) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  close = vi.fn();
  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
});
afterEach(() => { vi.unstubAllGlobals(); });

// ─────────────────────────────────────────────
// useSpringWebSocket — token source
// ─────────────────────────────────────────────
describe('useSpringWebSocket — token source', () => {
  it('token이 없으면 소켓 생성 없이 ERROR 상태가 된다', () => {
    vi.mocked(authSession.getAccessToken).mockReturnValue(null);
    const onStatusChange = vi.fn();

    const { result } = renderHook(() =>
      useSpringWebSocket({ sessionId: null, onMessage: vi.fn(), onStatusChange }),
    );
    act(() => result.current.connect('sid-1'));

    expect(MockWebSocket.instances).toHaveLength(0);
    expect(onStatusChange).toHaveBeenCalledWith('ERROR');
  });

  it('token이 있으면 URL에 token이 포함된 소켓을 생성한다', () => {
    vi.mocked(authSession.getAccessToken).mockReturnValue('my-token');

    const { result } = renderHook(() =>
      useSpringWebSocket({ sessionId: null, onMessage: vi.fn(), onStatusChange: vi.fn() }),
    );
    act(() => result.current.connect('sid-1'));

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toContain('token=my-token');
  });
});

// ─────────────────────────────────────────────
// useFastApiWebSocket — token source
// ─────────────────────────────────────────────
describe('useFastApiWebSocket — token source', () => {
  it('token이 없으면 소켓 생성 없이 ERROR 상태가 된다', () => {
    vi.mocked(authSession.getAccessToken).mockReturnValue(null);
    const onStatusChange = vi.fn();

    const { result } = renderHook(() =>
      useFastApiWebSocket({ sessionId: null, onMessage: vi.fn(), onStatusChange }),
    );
    act(() => result.current.connect('sid-1'));

    expect(MockWebSocket.instances).toHaveLength(0);
    expect(onStatusChange).toHaveBeenCalledWith('ERROR');
  });

  it('token이 있으면 URL에 token이 포함된 소켓을 생성한다', () => {
    vi.mocked(authSession.getAccessToken).mockReturnValue('my-token');

    const { result } = renderHook(() =>
      useFastApiWebSocket({ sessionId: null, onMessage: vi.fn(), onStatusChange: vi.fn() }),
    );
    act(() => result.current.connect('sid-1'));

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toContain('token=my-token');
  });
});

// ─────────────────────────────────────────────
// usePreflightCheck — token source (checkNetwork)
// ─────────────────────────────────────────────
describe('usePreflightCheck — token source', () => {
  it('token이 없으면 소켓 생성 없이 networkStatus가 fail이 된다', async () => {
    vi.mocked(authSession.getAccessToken).mockReturnValue(null);

    const { result } = renderHook(() => usePreflightCheck());
    act(() => { result.current.checkNetwork(); });

    await waitFor(() => expect(result.current.networkStatus).toBe('fail'));
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('token이 있으면 health 소켓을 생성하고 pass 상태가 된다', async () => {
    vi.mocked(authSession.getAccessToken).mockReturnValue('my-token');

    const { result } = renderHook(() => usePreflightCheck());
    const pending = result.current.checkNetwork();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toContain('token=my-token');

    act(() => { MockWebSocket.instances[0].onopen?.(); });
    await pending;
    await waitFor(() => expect(result.current.networkStatus).toBe('pass'));
  });
});
