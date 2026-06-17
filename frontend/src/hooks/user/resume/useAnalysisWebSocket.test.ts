// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../../utils/user/member/authSession', () => ({
  authSession: { getAccessToken: vi.fn() },
}));

// vi.hoisted — vi.mock 팩토리보다 먼저 실행 보장
const { mockActivate, mockDeactivate, mockClientInstances } = vi.hoisted(() => {
  const mockActivate   = vi.fn();
  const mockDeactivate = vi.fn();
  const mockClientInstances: Array<{ brokerURL: string }> = [];
  return { mockActivate, mockDeactivate, mockClientInstances };
});

vi.mock('@stomp/stompjs', () => ({
  Client: class MockClient {
    brokerURL: string;
    constructor(config: { brokerURL: string; [key: string]: unknown }) {
      this.brokerURL = config.brokerURL;
      Object.assign(this, config);
      mockClientInstances.push(this);
    }
    activate   = mockActivate;
    deactivate = mockDeactivate;
    subscribe  = vi.fn();
  },
}));

import { authSession } from '../../../utils/user/member/authSession';
import { useAnalysisWebSocket } from './useAnalysisWebSocket';

beforeEach(() => {
  vi.clearAllMocks();
  mockClientInstances.length = 0;
});

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

    expect(mockClientInstances).toHaveLength(0);
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

  it('token이 있으면 brokerURL에 token이 포함된 STOMP Client를 생성한다', () => {
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

    expect(mockClientInstances).toHaveLength(1);
    expect(mockClientInstances[0].brokerURL).toContain('token=my-token');
    expect(mockActivate).toHaveBeenCalledOnce();
  });
});
