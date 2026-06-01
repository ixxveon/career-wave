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

  const queueRef         = useRef<string[]>([]);
  const isPlayingRef     = useRef(false);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  /**
   * 세대 번호 — clear()/stop() 호출 시 증가
   * decodeAudioData() 완료 후 세대가 바뀌었으면 재생 취소
   */
  const generationRef = useRef(0);

  /**
   * 수동 중단 플래그 — stop()/clear() 호출 시 true
   * onended에서 다음 청크 자동 재생 방지용
   * 커스텀 프로퍼티를 AudioBufferSourceNode에 직접 붙이지 않고 ref로 관리
   */
  const stoppedManuallyRef = useRef(false);

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
    stoppedManuallyRef.current = false;
    setStatus('loading');

    // decodeAudioData() 시작 시점의 세대 번호 캡처
    const myGeneration = generationRef.current;

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

      // ArrayBuffer → AudioBuffer (비동기 디코딩)
      const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));

      // decodeAudioData() 완료 후 세대 확인
      // clear()/stop()이 호출됐으면 세대가 바뀌어 있으므로 재생 취소
      if (generationRef.current !== myGeneration) {
        isPlayingRef.current = false;
        return;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      currentSourceRef.current = source;

      setStatus('playing');
      source.start(0);

      source.onended = () => {
        isPlayingRef.current = false;
        currentSourceRef.current = null;
        // stoppedManuallyRef가 true면 stop()/clear() 호출로 인한 종료
        // → 다음 청크 재생하지 않음
        if (!stoppedManuallyRef.current) {
          playNextRef.current?.();
        }
      };
    } catch {
      // 디코딩 실패 시 해당 청크 스킵하고 다음 청크 재생 시도
      isPlayingRef.current = false;
      if (generationRef.current === myGeneration) {
        playNextRef.current?.();
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // playNext 최신 참조 유지
  playNextRef.current = playNext;

  const enqueue = useCallback((base64Audio: string) => {
    queueRef.current.push(base64Audio);
    if (!isPlayingRef.current) {
      playNextRef.current?.();
    }
  }, []);

  const stop = useCallback(() => {
    // 세대 번호 증가 → 진행 중인 decodeAudioData 완료 후 재생 취소
    generationRef.current += 1;
    // onended에서 다음 청크 재생 방지
    stoppedManuallyRef.current = true;
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
