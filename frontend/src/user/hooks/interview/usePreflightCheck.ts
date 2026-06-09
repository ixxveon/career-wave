import { useState, useCallback } from 'react';
import { WS_PING_TIMEOUT_MS } from '../../constants/interview';
import { authSession } from '../../utils/member/authSession';

export type CheckStatus = 'idle' | 'checking' | 'pass' | 'fail';

export interface PreflightResult {
  micStatus: CheckStatus;
  networkStatus: CheckStatus;
  checkMic: () => Promise<void>;
  checkNetwork: () => Promise<void>;
  isReady: boolean;
  reset: () => void;
}


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
    const rawToken = authSession.getAccessToken();
    if (!rawToken) {
      setNetworkStatus('fail');
      return;
    }
    const token = encodeURIComponent(rawToken);

    await new Promise<void>(resolve => {
      let ws: WebSocket;
      try {
        ws = new WebSocket(`${wsBase}/ws/health?token=${token}`);
      } catch {
        // URL 형식 오류 등 WebSocket 생성 자체가 실패한 경우
        setNetworkStatus('fail');
        resolve();
        return;
      }

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
