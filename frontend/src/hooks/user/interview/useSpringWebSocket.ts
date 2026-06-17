import { useRef, useCallback, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import type { SpringWSMessage } from '../../../types/user/interview';
import { MAX_RECONNECT_ATTEMPTS } from '../../../constants/user/interview';
import { authSession } from '../../../utils/user/member/authSession';

export type SpringWSStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'ERROR';

export interface UseSpringWebSocketOptions {
  sessionId: string | null;
  onMessage: (msg: SpringWSMessage) => void;
  onStatusChange: (status: SpringWSStatus) => void;
}

const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ??
  (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/^http/, 'ws');

export function useSpringWebSocket({
  sessionId,
  onMessage,
  onStatusChange,
}: UseSpringWebSocketOptions) {
  const clientRef         = useRef<Client | null>(null);
  const attemptRef        = useRef(0);
  const isManualCloseRef  = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 콜백 ref 패턴 — connect()가 콜백을 deps로 갖지 않도록 ref 경유
   * onMessage/onStatusChange가 바뀌어도 connect()는 재생성되지 않음
   * → 불필요한 WebSocket 재연결 방지
   */
  const onMessageRef      = useRef(onMessage);
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }
    attemptRef.current = 0;
    onStatusChangeRef.current('DISCONNECTED');
  }, []);

  const connect = useCallback((sid: string) => {
    if (clientRef.current?.active) return;

    const token = authSession.getAccessToken();
    if (!token) {
      onStatusChangeRef.current('ERROR');
      return;
    }

    isManualCloseRef.current = false;
    onStatusChangeRef.current(attemptRef.current === 0 ? 'CONNECTING' : 'RECONNECTING');

    const client = new Client({
      brokerURL: `${WS_BASE_URL}/ws/user/interview`,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 0,
      onConnect: () => {
        attemptRef.current = 0;
        onStatusChangeRef.current('CONNECTED');

        client.subscribe(`/topic/interview/${sid}`, (frame) => {
          try {
            const msg = JSON.parse(frame.body) as SpringWSMessage;
            onMessageRef.current(msg);
          } catch { /* 파싱 실패 무시 */ }
        });
      },
      onStompError: () => {
        if (isManualCloseRef.current) return;
        onStatusChangeRef.current('ERROR');
      },
      onWebSocketError: () => { /* onWebSocketClose가 항상 뒤따르므로 재연결은 Close에서만 처리 */ },
      onWebSocketClose: () => {
        if (isManualCloseRef.current) return;
        if (attemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
          onStatusChangeRef.current('ERROR');
          return;
        }
        attemptRef.current += 1;
        onStatusChangeRef.current('RECONNECTING');
        clientRef.current = null;
        reconnectTimerRef.current = setTimeout(() => connect(sid), 2000);
      },
    });

    clientRef.current = client;
    client.activate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sessionId) return;
    connect(sessionId);
    return () => {
      isManualCloseRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      clientRef.current?.deactivate();
      clientRef.current = null;
    };
  }, [sessionId, connect]);

  return { connect, disconnect };
}
