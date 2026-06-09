import { useRef, useCallback, useEffect } from 'react';
import type { SpringWSMessage } from '../../../types/user/interview';
import { MAX_RECONNECT_ATTEMPTS } from '../../../constants/user/interview';
import { authSession } from '../../../utils/user/member/authSession';

export type SpringWSStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';

export interface UseSpringWebSocketOptions {
  sessionId: string | null;
  onMessage: (msg: SpringWSMessage) => void;
  onStatusChange: (status: SpringWSStatus) => void;
}

const RECONNECT_DELAY_MS = 2000;

export function useSpringWebSocket({
  sessionId,
  onMessage,
  onStatusChange,
}: UseSpringWebSocketOptions) {
  const wsRef             = useRef<WebSocket | null>(null);
  const attemptRef        = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManualCloseRef  = useRef(false);

  /**
   * 콜백 ref 패턴 — connect()가 콜백을 deps로 갖지 않도록 ref 경유
   * onMessage/onStatusChange가 바뀌어도 connect()는 재생성되지 않음
   * → 불필요한 WebSocket 재연결 방지
   */
  const onMessageRef      = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

  const getWsUrl = (sid: string): string => {
    const token = authSession.getAccessToken();
    if (!token) throw new Error('인증 토큰이 없습니다. 로그인 후 다시 시도해주세요.');
    const base =
      import.meta.env.VITE_WS_BASE_URL ||
      (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/^http/, 'ws');
    return `${base}/ws/interview/${sid}/chat?token=${encodeURIComponent(token)}`;
  };

  const connect = useCallback((sid: string) => {
    const state = wsRef.current?.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;

    onStatusChangeRef.current(attemptRef.current === 0 ? 'CONNECTING' : 'RECONNECTING');
    let ws: WebSocket;
    try {
      ws = new WebSocket(getWsUrl(sid));
    } catch {
      onStatusChangeRef.current('ERROR');
      return;
    }
    wsRef.current = ws;

    ws.onopen = (): void => {
      if (wsRef.current !== ws) return;
      attemptRef.current = 0;
      onStatusChangeRef.current('CONNECTED');
    };

    ws.onmessage = (event: MessageEvent) => {
      if (wsRef.current !== ws) return;
      try {
        const msg = JSON.parse(event.data as string) as SpringWSMessage;
        onMessageRef.current(msg);
      } catch { /* 파싱 실패 무시 */ }
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      if (isManualCloseRef.current) {
        onStatusChangeRef.current('DISCONNECTED');
        return;
      }
      if (attemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        onStatusChangeRef.current('ERROR');
        return;
      }
      attemptRef.current += 1;
      onStatusChangeRef.current('RECONNECTING');
      reconnectTimerRef.current = setTimeout(() => connect(sid), RECONNECT_DELAY_MS);
    };

    ws.onerror = () => { ws.close(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    wsRef.current?.close();
    wsRef.current = null;
    attemptRef.current = 0;
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    isManualCloseRef.current = false;
    connect(sessionId);
    return () => {
      isManualCloseRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sessionId, connect]);

  return { connect, disconnect };
}
