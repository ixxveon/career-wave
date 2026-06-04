import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseInterviewTimerOptions {
  /** 타이머 최대 시간 (초) — spec FR-004: 150초 */
  duration: number;
  /** 타이머 만료 시 콜백 */
  onExpire: () => void;
}

export interface UseInterviewTimerResult {
  remaining: number;
  active: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useInterviewTimer({
  duration,
  onExpire,
}: UseInterviewTimerOptions): UseInterviewTimerResult {
  const [remaining, setRemaining] = useState(duration);
  const [active, setActive]       = useState(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onExpireRef = useRef(onExpire);

  // onExpire 최신 참조 유지 (stale closure 방지)
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (!active) return;
    if (remaining <= 0) {
      setActive(false);
      onExpireRef.current();
      return;
    }
    timerRef.current = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [remaining, active]);

  const start = useCallback(() => {
    setRemaining(duration);
    setActive(true);
  }, [duration]);

  const stop = useCallback(() => {
    setActive(false);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
  }, []);

  const reset = useCallback(() => {
    setActive(false);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setRemaining(duration);
  }, [duration]);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return { remaining, active, start, stop, reset };
}
