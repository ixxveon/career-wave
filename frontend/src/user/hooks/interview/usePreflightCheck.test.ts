import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * usePreflightCheck 핵심 로직 테스트
 *
 * React hook 자체는 renderHook 없이 내부 로직만 검증
 * - 마이크 권한 획득/거부 → pass/fail
 * - WebSocket ping: open → pass / error → fail / timeout → fail
 */

// ── 마이크 권한 유틸 (훅 내부 로직과 동일) ─────────
async function checkMicLogic(): Promise<'pass' | 'fail'> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return 'pass';
  } catch {
    return 'fail';
  }
}

// ── WebSocket ping 유틸 (훅 내부 로직과 동일) ──────
async function checkNetworkLogic(
  wsUrl: string,
  timeoutMs = 5000,
): Promise<'pass' | 'fail'> {
  return new Promise<'pass' | 'fail'>(resolve => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      resolve('fail');
      return;
    }
    const timer = setTimeout(() => {
      ws.close();
      resolve('fail');
    }, timeoutMs);

    ws.onopen = () => { clearTimeout(timer); ws.close(); resolve('pass'); };
    ws.onerror = () => { clearTimeout(timer); resolve('fail'); };
  });
}

// ══════════════════════════════════════════════════
// 마이크 권한
// ══════════════════════════════════════════════════
describe('checkMic', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia: vi.fn() },
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('권한 허용 시 pass를 반환한다', async () => {
    const mockTrack = { stop: vi.fn() };
    const mockStream = { getTracks: () => [mockTrack] };
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(mockStream as unknown as MediaStream);

    const result = await checkMicLogic();
    expect(result).toBe('pass');
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  it('권한 거부(NotAllowedError) 시 fail을 반환한다', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      Object.assign(new Error('NotAllowedError'), { name: 'NotAllowedError' }),
    );
    const result = await checkMicLogic();
    expect(result).toBe('fail');
  });

  it('기기 없음(NotFoundError) 시 fail을 반환한다', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      Object.assign(new Error('NotFoundError'), { name: 'NotFoundError' }),
    );
    const result = await checkMicLogic();
    expect(result).toBe('fail');
  });
});

// ══════════════════════════════════════════════════
// WebSocket ping
// ══════════════════════════════════════════════════
describe('checkNetwork', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  /** class 기반 MockWebSocket 팩토리 — vitest 생성자 mock 요구사항 충족 */
  function makeMockWsClass(trigger: 'open' | 'error' | 'none' | 'throw') {
    const instances: { close: ReturnType<typeof vi.fn> }[] = [];
    class MockWebSocket {
      onopen:  (() => void) | null = null;
      onerror: (() => void) | null = null;
      close = vi.fn();
      constructor(_url: string) {
        if (trigger === 'throw') throw new Error('invalid url');
        instances.push(this);
        if (trigger === 'open') {
          Promise.resolve().then(() => this.onopen?.());
        } else if (trigger === 'error') {
          Promise.resolve().then(() => this.onerror?.());
        }
        // 'none' → 타임아웃 대기
      }
    }
    return { MockWebSocket, instances };
  }

  it('WebSocket open 이벤트 발생 시 pass를 반환한다', async () => {
    const { MockWebSocket, instances } = makeMockWsClass('open');
    vi.stubGlobal('WebSocket', MockWebSocket);

    const result = await checkNetworkLogic('ws://localhost:8080/ws/health', 1000);
    expect(result).toBe('pass');
    expect(instances[0].close).toHaveBeenCalled();
  });

  it('WebSocket error 이벤트 발생 시 fail을 반환한다', async () => {
    const { MockWebSocket } = makeMockWsClass('error');
    vi.stubGlobal('WebSocket', MockWebSocket);

    const result = await checkNetworkLogic('ws://localhost:8080/ws/health', 1000);
    expect(result).toBe('fail');
  });

  it('타임아웃 초과 시 fail을 반환한다', async () => {
    const { MockWebSocket, instances } = makeMockWsClass('none');
    vi.stubGlobal('WebSocket', MockWebSocket);

    const result = await checkNetworkLogic('ws://localhost:8080/ws/health', 50);
    expect(result).toBe('fail');
    expect(instances[0].close).toHaveBeenCalled();
  }, 500);

  it('잘못된 URL로 WebSocket 생성 실패 시 fail을 반환한다', async () => {
    const { MockWebSocket } = makeMockWsClass('throw');
    vi.stubGlobal('WebSocket', MockWebSocket);

    const result = await checkNetworkLogic('not-a-valid-url', 1000);
    expect(result).toBe('fail');
  });
});
