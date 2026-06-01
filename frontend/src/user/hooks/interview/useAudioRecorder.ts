import { useRef, useState, useCallback, useEffect } from 'react';
import { getSupportedMimeType } from '../../utils/interview/audioUtils';
import { submitVoiceBlob } from '../../api/interview/submitVoiceBlob';

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'error';
export type RecorderError = 'permission_denied' | 'not_supported' | 'unknown';

export interface UseAudioRecorderOptions {
  sessionId: string | null;
  questionOrder: number;
  onChunkSent?: (chunkIndex: number, isFinal: boolean) => void;
  onError?: (error: RecorderError) => void;
  onStop?: () => void;
}

export interface UseAudioRecorderResult {
  status: RecorderStatus;
  error: RecorderError | null;
  start: () => Promise<void>;
  stop: () => void;
}

/** 5초 단위 청크 전송 (spec FR-003, constitution.md §7) */
const CHUNK_INTERVAL_MS = 5000;

export function useAudioRecorder({
  sessionId,
  questionOrder,
  onChunkSent,
  onError,
  onStop,
}: UseAudioRecorderOptions): UseAudioRecorderResult {
  const [status, setStatus]   = useState<RecorderStatus>('idle');
  const [error, setError]     = useState<RecorderError | null>(null);

  const recorderRef       = useRef<MediaRecorder | null>(null);
  const streamRef         = useRef<MediaStream | null>(null);
  const chunkIndexRef     = useRef(0);
  const isStoppingRef     = useRef(false);   // stop() 호출 여부 추적 → 마지막 청크 isFinal 판단
  const questionOrderRef  = useRef(questionOrder);

  // questionOrder가 바뀌면 ref 업데이트 (stale closure 방지)
  useEffect(() => {
    questionOrderRef.current = questionOrder;
  }, [questionOrder]);

  /** 청크 전송 — 실패 시 1회 재시도 */
  async function sendChunk(blob: Blob, isFinal: boolean) {
    if (!sessionId) return;
    const idx = chunkIndexRef.current++;
    const params = {
      blob,
      questionOrder: questionOrderRef.current,
      chunkIndex: idx,
      isFinal,
    };
    try {
      await submitVoiceBlob(sessionId, params);
      onChunkSent?.(idx, isFinal);
    } catch {
      try {
        await submitVoiceBlob(sessionId, params);
        onChunkSent?.(idx, isFinal);
      } catch {
        // 재시도도 실패 시 무시 — STT 실패는 FastAPI WS ERROR 메시지로 별도 처리
      }
    }
  }

  /** constitution.md §4: 스트림 반드시 해제하여 마이크 켜짐 상태 방지 */
  function releaseStream() {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  const start = useCallback(async () => {
    if (typeof MediaRecorder === 'undefined') {
      setError('not_supported');
      setStatus('error');
      onError?.('not_supported');
      return;
    }

    setStatus('requesting');
    setError(null);
    chunkIndexRef.current = 0;
    isStoppingRef.current = false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const recorderError: RecorderError =
        (e as Error).name === 'NotAllowedError' ? 'permission_denied' : 'unknown';
      setError(recorderError);
      setStatus('error');
      onError?.(recorderError);
      return;
    }

    streamRef.current = stream;

    let recorder: MediaRecorder;
    try {
      const mimeType = getSupportedMimeType();
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
    } catch {
      // MIME 타입 미지원 등 MediaRecorder 생성 실패
      releaseStream();
      setError('not_supported');
      setStatus('error');
      onError?.('not_supported');
      return;
    }

    /**
     * timeslice: 5000 — 5초마다 ondataavailable 발동
     * stop() 호출 시 마지막 잔여 버퍼도 ondataavailable로 전달됨
     * isStoppingRef로 마지막 청크 여부를 구분
     */
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        sendChunk(e.data, isStoppingRef.current);
      }
    };

    recorder.onstop = () => {
      releaseStream();
      setStatus('idle');
      onStop?.();
    };

    recorder.onerror = () => {
      releaseStream();
      setError('unknown');
      setStatus('error');
      onError?.('unknown');
    };

    try {
      recorder.start(CHUNK_INTERVAL_MS);
    } catch {
      // 스트림 상태 이상 등 start() 실패
      releaseStream();
      setError('unknown');
      setStatus('error');
      onError?.('unknown');
      return;
    }

    setStatus('recording');
  }, [sessionId, onError, onChunkSent, onStop]); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = useCallback(() => {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') return;
    // stop() 전에 플래그 설정 → ondataavailable에서 isFinal: true로 전송
    isStoppingRef.current = true;
    recorderRef.current.stop();
  }, []);

  // 언마운트 시 스트림 강제 해제 (constitution.md §4 불변 규칙)
  useEffect(() => {
    return () => {
      isStoppingRef.current = true;
      // inactive 상태에서 stop() 호출 시 InvalidStateError 방지
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      releaseStream();
    };
  }, []);

  return { status, error, start, stop };
}
