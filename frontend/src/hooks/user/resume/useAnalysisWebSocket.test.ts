// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalysisWebSocket } from './useAnalysisWebSocket';

vi.mock('../../../utils/user/member/authSession', () => ({
  authSession: { getAccessToken: vi.fn() },
}));

import { authSession } from '../../../utils/user/member/authSession';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;
  url: string;
  readyState = 3;
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
// useAnalysisWebSocket — token source
// ─────────────────────────────────────────────
describe('useAnalysisWebSocket — token source', () => {
  it('token이 없으면 소켓 생성 없이 onFailed가 호출된다', () => {
    vi.mocked(authSession.getAccessToken).mockReturnValue(null);
    const onFailed = vi.fn();

    const { result } = renderHook(() =>
      useAnalysisWebSocket({
        onMessage: vi.fn(),
        onCompleted: vi.fn(),
        onFailed,
        onNetworkError: vi.fn(),
      }),
    );
    act(() => result.current.connect('doc-id-1'));

    expect(MockWebSocket.instances).toHaveLength(0);
    expect(onFailed).toHaveBeenCalledWith(expect.stringContaining('인증'));
  });

  it('token이 없으면 connect() 후 isConnected가 false를 유지한다', () => {
    vi.mocked(authSession.getAccessToken).mockReturnValue(null);

    const { result } = renderHook(() =>
      useAnalysisWebSocket({
        onMessage: vi.fn(),
        onCompleted: vi.fn(),
        onFailed: vi.fn(),
        onNetworkError: vi.fn(),
      }),
    );
    act(() => result.current.connect('doc-id-1'));

    expect(result.current.isConnected).toBe(false);
  });

  it('token이 있으면 URL에 token이 포함된 소켓을 생성한다', () => {
    vi.mocked(authSession.getAccessToken).mockReturnValue('my-token');

    const { result } = renderHook(() =>
      useAnalysisWebSocket({
        onMessage: vi.fn(),
        onCompleted: vi.fn(),
        onFailed: vi.fn(),
        onNetworkError: vi.fn(),
      }),
    );
    act(() => result.current.connect('doc-id-1'));

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toContain('token=my-token');
  });
});
