import { useState, useCallback } from 'react';

export type CheckStatus = 'idle' | 'checking' | 'pass' | 'fail';

export interface PreflightResult {
  micStatus: CheckStatus;
  networkStatus: CheckStatus;
  checkMic: () => Promise<void>;
  checkNetwork: () => Promise<void>;
  isReady: boolean;
  reset: () => void;
}

const WS_PING_TIMEOUT_MS = 5000;

export function usePreflightCheck(): PreflightResult {
  const [micStatus, setMicStatus] = useState<CheckStatus>('idle');
  const [networkStatus, setNetworkStatus] = useState<CheckStatus>('idle');

  const checkMic = useCallback(async () => {
    setMicStatus('checking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicStatus('pass');
    } catch {
      setMicStatus('fail');
    }
  }, []);

  /**
   * WebSocket 서버 연결 가능 여부 ping/pong 확인
   * 세션 ID 없이 health 엔드포인트로 WS 연결 시도
   */
  const checkNetwork = useCallback(async () => {
    setNetworkStatus('checking');
    const wsBase =
      import.meta.env.VITE_WS_BASE_URL ||
      (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/^http/, 'ws');
    const token = localStorage.getItem('accessToken') ?? '';

    await new Promise<void>(resolve => {
      const ws = new WebSocket(`${wsBase}/ws/health?token=${token}`);
      const timer = setTimeout(() => {
        ws.close();
        setNetworkStatus('fail');
        resolve();
      }, WS_PING_TIMEOUT_MS);

      ws.onopen = () => {
        clearTimeout(timer);
        ws.close();
        setNetworkStatus('pass');
        resolve();
      };
      ws.onerror = () => {
        clearTimeout(timer);
        setNetworkStatus('fail');
        resolve();
      };
    });
  }, []);

  const reset = useCallback(() => {
    setMicStatus('idle');
    setNetworkStatus('idle');
  }, []);

  const isReady = micStatus === 'pass' && networkStatus === 'pass';

  return { micStatus, networkStatus, checkMic, checkNetwork, isReady, reset };
}
