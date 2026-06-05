import { useRef, useState, useCallback, useEffect } from 'react';
import { getSupportedMimeType } from '../../utils/interview/audioUtils';
import { interviewSessionApi } from '../../api/interview';
import { CHUNK_INTERVAL_MS } from '../../constants/interview';

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'error';
export type RecorderError = 'permission_denied' | 'not_supported' | 'unknown';

export interface UseAudioRecorderOptions {
  sessionId: string | null;
  questionOrder: number;
  onChunkSent?: (chunkIndex: number, isFinal: boolean) => void;
  /** 청크 전송 2회 모두 실패 시 호출 — isFinal: true 실패 시 pending 말풍선 정리 필요 */
  onChunkFailed?: (chunkIndex: number, isFinal: boolean) => void;
  onError?: (error: RecorderError) => void;
  onStop?: () => void;
}

export interface UseAudioRecorderResult {
  status: RecorderStatus;
  error: RecorderError | null;
  start: () => Promise<void>;
  /** 답변 제출 — isFinal: true 청크 전송 후 onStop 콜백 실행 */
  stop: () => void;
  /** 모드 전환/취소 — 청크 전송 없이 녹음만 중단, onStop 미실행 */
  cancel: () => void;
}

/** 5초 단위 청크 전송 (spec FR-003, constitution.md §7) */

export function useAudioRecorder({
  sessionId,
  questionOrder,
  onChunkSent,
  onChunkFailed,
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

  /**
   * 콜백 ref 패턴 — recorder.onstop이 항상 최신 onStop을 호출하도록 보장
   * recorder.onstop은 start() 시점에 등록되므로 stale closure 위험이 있음
   */
  const onStopRef        = useRef(onStop);
  const onErrorRef       = useRef(onError);
  const onChunkFailedRef = useRef(onChunkFailed);
  useEffect(() => { onStopRef.current        = onStop;        }, [onStop]);
  useEffect(() => { onErrorRef.current       = onError;       }, [onError]);
  useEffect(() => { onChunkFailedRef.current = onChunkFailed; }, [onChunkFailed]);

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
      await interviewSessionApi.submitVoiceBlob(sessionId, params);
      onChunkSent?.(idx, isFinal);
    } catch {
      try {
        await interviewSessionApi.submitVoiceBlob(sessionId, params);
        onChunkSent?.(idx, isFinal);
      } catch {
        // 재시도도 실패 — isFinal 청크면 상위에 알려 pending 말풍선 정리 및 사용자 안내
        onChunkFailedRef.current?.(idx, isFinal);
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
     *
     * sendChunk는 start() 호출 시점의 sessionId를 클로저로 캡처한다.
     * 녹음 중 sessionId가 변경되지 않는 것을 전제로 한다.
     * (면접 세션은 시작 후 종료까지 sessionId가 고정됨)
     */
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) {
        sendChunk(e.data, isStoppingRef.current);
      }
    };

    recorder.onstop = () => {
      releaseStream();
      setStatus('idle');
      onStopRef.current?.();  // ref 경유 → 항상 최신 onStop 호출
    };

    recorder.onerror = () => {
      releaseStream();
      setError('unknown');
      setStatus('error');
      onErrorRef.current?.('unknown');  // ref 경유
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

  /**
   * 취소 전용 — 모드 전환 시 사용
   * ondataavailable �핸들러를 제거하여 잔여 청크 전송 차단
   * onStop 콜백 미실행 → pending 말풍선 완료 처리 없음
   */
  const cancel = useCallback(() => {
    if (!recorderRef.current || recorderRef.current.state === 'inactive') return;
    // 잔여 데이터 전송 차단
    recorderRef.current.ondataavailable = null;
    recorderRef.current.onstop = null;
    recorderRef.current.stop();
    releaseStream();
    setStatus('idle');
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

  return { status, error, start, stop, cancel };
}
