import { useRef, useState, useCallback } from 'react';

export type TTSQueueStatus = 'idle' | 'loading' | 'playing';

export interface UseTTSQueueResult {
  status: TTSQueueStatus;
  /** FastAPI WS에서 수신한 base64 인코딩 오디오 청크를 큐에 추가 */
  enqueue: (base64Audio: string) => void;
  /** 현재 재생 중인 오디오 중단 (큐는 유지) */
  stop: () => void;
  /** 현재 재생 중단 + 큐 전체 비우기 */
  clear: () => void;
}

export function useTTSQueue(): UseTTSQueueResult {
  const [status, setStatus] = useState<TTSQueueStatus>('idle');

  const queueRef        = useRef<string[]>([]);
  const isPlayingRef    = useRef(false);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  /** AudioContext 싱글턴 — 닫혔으면 새로 생성 */
  function getAudioContext(): AudioContext {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }

  /**
   * 큐에서 다음 오디오를 꺼내 재생
   * onended에서 재귀 호출하여 순차 재생 보장 (constitution.md §4 오디오 재생 순서)
   * playNextRef 패턴으로 onended 내부 stale closure 방지
   */
  const playNextRef = useRef<() => Promise<void>>(async () => {});

  const playNext = useCallback(async () => {
    if (isPlayingRef.current) return;
    if (queueRef.current.length === 0) {
      setStatus('idle');
      return;
    }

    const base64 = queueRef.current.shift()!;
    isPlayingRef.current = true;
    setStatus('loading');

    try {
      const ctx = getAudioContext();

      // 브라우저 autoplay 정책으로 suspended 상태일 수 있으므로 resume
      if (ctx.state === 'suspended') await ctx.resume();

      // base64 → Uint8Array → ArrayBuffer
      const binary = atob(base64);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // ArrayBuffer → AudioBuffer (디코딩)
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));

      // AudioBufferSourceNode 생성 및 재생
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      currentSourceRef.current = source;

      setStatus('playing');
      source.start(0);

      source.onended = () => {
        isPlayingRef.current = false;
        currentSourceRef.current = null;
        // 다음 청크 재생 (stale closure 방지를 위해 ref 경유)
        playNextRef.current?.();
      };
    } catch {
      // 디코딩 실패 시 해당 청크 스킵하고 다음 청크 재생 시도
      isPlayingRef.current = false;
      playNextRef.current?.();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // playNext 최신 참조 유지
  playNextRef.current = playNext;

  const enqueue = useCallback((base64Audio: string) => {
    queueRef.current.push(base64Audio);
    // 재생 중이 아닐 때만 즉시 시작 (재생 중이면 onended에서 자동으로 다음 재생)
    if (!isPlayingRef.current) {
      playNextRef.current?.();
    }
  }, []);

  const stop = useCallback(() => {
    try { currentSourceRef.current?.stop(); } catch { /* 이미 종료된 경우 무시 */ }
    currentSourceRef.current = null;
    isPlayingRef.current = false;
    setStatus('idle');
  }, []);

  const clear = useCallback(() => {
    queueRef.current = [];
    stop();
  }, [stop]);

  return { status, enqueue, stop, clear };
}
