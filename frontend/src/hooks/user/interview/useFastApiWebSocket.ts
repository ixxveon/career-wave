import { useRef, useCallback, useEffect } from 'react';
import type { FastApiWSMessage } from '../../../types/user/interview';
import { MAX_RECONNECT_ATTEMPTS } from '../../../constants/user/interview';

export type FastApiWSStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';

export interface UseFastApiWebSocketOptions {
  sessionId: string | null;
  onMessage: (msg: FastApiWSMessage) => void;
  onStatusChange: (status: FastApiWSStatus) => void;
}

const RECONNECT_DELAY_MS = 2000;

export function useFastApiWebSocket({
  sessionId,
  onMessage,
  onStatusChange,
}: UseFastApiWebSocketOptions) {
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

  const getWsUrl = (sid: string) => {
    const base =
      import.meta.env.VITE_FASTAPI_WS_URL ||
      import.meta.env.VITE_FASTAPI_BASE_URL?.replace(/^http/, 'ws') ||
      'ws://localhost:8000';
    const token = encodeURIComponent(localStorage.getItem('accessToken') ?? '');
    return `${base}/ws/interview/${sid}/ai?token=${token}`;
  };

  const connect = useCallback((sid: string) => {
    const state = wsRef.current?.readyState;
    if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;

    onStatusChangeRef.current(attemptRef.current === 0 ? 'CONNECTING' : 'RECONNECTING');
    const ws = new WebSocket(getWsUrl(sid));
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
      attemptRef.current = 0;
      onStatusChangeRef.current('CONNECTED');
    };

    ws.onmessage = (event: MessageEvent) => {
      if (wsRef.current !== ws) return;
      try {
        const msg = JSON.parse(event.data as string) as FastApiWSMessage;
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
