import { useRef, useCallback, useEffect } from 'react';
import type { SpringWSMessage } from '../../types/interview';

export type SpringWSStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';

export interface UseSpringWebSocketOptions {
  sessionId: string | null;
  onMessage: (msg: SpringWSMessage) => void;
  onStatusChange: (status: SpringWSStatus) => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 2000;

export function useSpringWebSocket({
  sessionId,
  onMessage,
  onStatusChange,
}: UseSpringWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManualCloseRef = useRef(false);

  const getWsUrl = (sid: string) => {
    const base =
      import.meta.env.VITE_WS_BASE_URL ||
      (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/^http/, 'ws');
    const token = encodeURIComponent(localStorage.getItem('accessToken') ?? '');
    return `${base}/ws/interview/${sid}/chat?token=${token}`;
  };

  const connect = useCallback(
    (sid: string) => {
      // OPEN 또는 CONNECTING 상태면 중복 연결 방지
      const state = wsRef.current?.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;

      onStatusChange(attemptRef.current === 0 ? 'CONNECTING' : 'RECONNECTING');
      const ws = new WebSocket(getWsUrl(sid));
      wsRef.current = ws;

      ws.onopen = () => {
        // 연결 시점에 현재 소켓인지 확인 (sessionId 변경으로 교체된 경우 무시)
        if (wsRef.current !== ws) return;
        attemptRef.current = 0;
        onStatusChange('CONNECTED');
      };

      ws.onmessage = (event: MessageEvent) => {
        if (wsRef.current !== ws) return;
        try {
          const msg = JSON.parse(event.data as string) as SpringWSMessage;
          onMessage(msg);
        } catch {
          /* 파싱 실패는 무시 */
        }
      };

      ws.onclose = () => {
        // 이미 교체된 소켓의 onclose는 재연결 시도하지 않음
        if (wsRef.current !== ws) return;
        if (isManualCloseRef.current) {
          onStatusChange('DISCONNECTED');
          return;
        }
        if (attemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
          onStatusChange('ERROR');
          return;
        }
        attemptRef.current += 1;
        onStatusChange('RECONNECTING');
        reconnectTimerRef.current = setTimeout(() => connect(sid), RECONNECT_DELAY_MS);
      };

      ws.onerror = () => {
        ws.close();
      };
    },
    [onMessage, onStatusChange],
  );

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
