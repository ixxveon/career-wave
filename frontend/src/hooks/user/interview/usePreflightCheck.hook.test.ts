// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePreflightCheck } from './usePreflightCheck';

vi.mock('../../../utils/user/member/authSession', () => ({
  authSession: {
    getAccessToken: vi.fn(() => 'mock-access-token'),
  },
}));

// ══════════════════════════════════════════════════
// 마이크 권한 (checkMic)
// ══════════════════════════════════════════════════
describe('usePreflightCheck — checkMic', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn() },
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('초기 micStatus는 idle이다', () => {
    const { result } = renderHook(() => usePreflightCheck());
    expect(result.current.micStatus).toBe('idle');
  });

  it('권한 허용 시 micStatus가 pass가 된다', async () => {
    const mockTrack = { stop: vi.fn() };
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(
      { getTracks: () => [mockTrack] } as unknown as MediaStream,
    );

    const { result } = renderHook(() => usePreflightCheck());
    act(() => { result.current.checkMic(); });

    await waitFor(() => expect(result.current.micStatus).toBe('pass'));
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  it('권한 거부(NotAllowedError) 시 micStatus가 fail이 된다', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      Object.assign(new Error(), { name: 'NotAllowedError' }),
    );

    const { result } = renderHook(() => usePreflightCheck());
    act(() => { result.current.checkMic(); });

    await waitFor(() => expect(result.current.micStatus).toBe('fail'));
  });

  it('기기 없음(NotFoundError) 시 micStatus가 fail이 된다', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      Object.assign(new Error(), { name: 'NotFoundError' }),
    );

    const { result } = renderHook(() => usePreflightCheck());
    act(() => { result.current.checkMic(); });

    await waitFor(() => expect(result.current.micStatus).toBe('fail'));
  });
});

// ══════════════════════════════════════════════════
// WebSocket ping (checkNetwork)
// ══════════════════════════════════════════════════
describe('usePreflightCheck — checkNetwork', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  function makeMockWsClass(trigger: 'open' | 'error' | 'none' | 'throw') {
    const instances: { close: ReturnType<typeof vi.fn>; onopen: (() => void) | null; onerror: (() => void) | null }[] = [];
    class MockWebSocket {
      onopen:  (() => void) | null = null;
      onerror: (() => void) | null = null;
      close = vi.fn();
      constructor(_url: string) {
        if (trigger === 'throw') throw new Error('invalid url');
        instances.push(this);
        if (trigger === 'open')  Promise.resolve().then(() => this.onopen?.());
        if (trigger === 'error') Promise.resolve().then(() => this.onerror?.());
      }
    }
    return { MockWebSocket, instances };
  }

  it('초기 networkStatus는 idle이다', () => {
    const { result } = renderHook(() => usePreflightCheck());
    expect(result.current.networkStatus).toBe('idle');
  });

  it('WebSocket open 시 networkStatus가 pass가 된다', async () => {
    const { MockWebSocket, instances } = makeMockWsClass('open');
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result } = renderHook(() => usePreflightCheck());
    act(() => { result.current.checkNetwork(); });

    await waitFor(() => expect(result.current.networkStatus).toBe('pass'));
    expect(instances[0].close).toHaveBeenCalled();
  });

  it('WebSocket error 시 networkStatus가 fail이 된다', async () => {
    const { MockWebSocket } = makeMockWsClass('error');
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result } = renderHook(() => usePreflightCheck());
    act(() => { result.current.checkNetwork(); });

    await waitFor(() => expect(result.current.networkStatus).toBe('fail'));
  });

  it('타임아웃 초과 시 networkStatus가 fail이 된다', async () => {
    const { MockWebSocket, instances } = makeMockWsClass('none');
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result } = renderHook(() => usePreflightCheck());
    act(() => { result.current.checkNetwork(); });

    await waitFor(
      () => expect(result.current.networkStatus).toBe('fail'),
      { timeout: 7000 },
    );
    expect(instances[0].close).toHaveBeenCalled();
  }, 8000);

  it('잘못된 URL로 WebSocket 생성 실패 시 networkStatus가 fail이 된다', async () => {
    const { MockWebSocket } = makeMockWsClass('throw');
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result } = renderHook(() => usePreflightCheck());
    act(() => { result.current.checkNetwork(); });

    await waitFor(() => expect(result.current.networkStatus).toBe('fail'));
  });

  it('isReady는 mic과 network 모두 pass일 때만 true다', async () => {
    const mockTrack = { stop: vi.fn() };
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [mockTrack] } as unknown as MediaStream) },
    });
    const { MockWebSocket } = makeMockWsClass('open');
    vi.stubGlobal('WebSocket', MockWebSocket);

    const { result } = renderHook(() => usePreflightCheck());
    expect(result.current.isReady).toBe(false);

    act(() => { result.current.checkMic(); result.current.checkNetwork(); });

    await waitFor(() => expect(result.current.isReady).toBe(true));
  });
});
