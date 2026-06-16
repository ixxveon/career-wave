import { useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import type { WsStatusMessage } from '../../../types/user/resume';
import { authSession } from '../../../utils/user/member/authSession';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL
  ?? window.location.origin.replace(/^https/, 'wss').replace(/^http/, 'ws');

// spec.md NFR-001: 분석 완료까지 30초 이내 처리
const ANALYSIS_TIMEOUT_MS = 30_000;

interface UseAnalysisWebSocketOptions {
  /** WebSocket 메시지 수신 (ANALYZING 중 단계별 메시지) */
  onMessage: (msg: WsStatusMessage) => void;
  /** 분석 완료 (COMPLETED) */
  onCompleted: () => void;
  /** 분석 실패 (FAILED 또는 서버 에러) */
  onFailed: (message: string) => void;
  /** 네트워크 단절 — 토스트 메시지 표시용 */
  onNetworkError: () => void;
}

export interface UseAnalysisWebSocketReturn {
  connect: (documentId: string) => void;
  disconnect: () => void;
  isConnected: boolean;
}

/**
 * 분석 상태 실시간 구독 STOMP WebSocket 훅
 *
 * api-schema.md §5 기준:
 * - STOMP 엔드포인트: /ws/user/resume?token={accessToken}
 * - 브로드캐스트 구독: /topic/resume/{documentId}/status
 * - 개인 Snapshot 구독: /user/queue/resume/{documentId}/status
 * - COMPLETED 수신 시 onCompleted 콜백 호출 후 연결 종료
 * - FAILED 수신 시 errorMessage 우선, null이면 message로 폴백
 * - 30초 타임아웃 초과 시 onFailed 호출 (NFR-001)
 */
export function useAnalysisWebSocket({
  onMessage,
  onCompleted,
  onFailed,
  onNetworkError,
}: UseAnalysisWebSocketOptions): UseAnalysisWebSocketReturn {
  const clientRef   = useRef<Client | null>(null);
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const clearAnalysisTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearAnalysisTimeout();
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
    }
    setIsConnected(false);
  }, [clearAnalysisTimeout]);

  const connect = useCallback(
    (documentId: string) => {
      disconnect();

      const token = authSession.getAccessToken();
      if (!token) {
        onFailed('인증 토큰이 없습니다. 로그인 후 다시 시도해주세요.');
        return;
      }

      const brokerURL = `${WS_BASE_URL}/ws/user/resume?token=${encodeURIComponent(token)}`;

      function handleMessage(body: string) {
        try {
          const msg: WsStatusMessage = JSON.parse(body);
          onMessage(msg);

          if (msg.status === 'COMPLETED') {
            clearAnalysisTimeout();
            clientRef.current?.deactivate();
            clientRef.current = null;
            setIsConnected(false);
            onCompleted();
          } else if (msg.status === 'FAILED') {
            clearAnalysisTimeout();
            clientRef.current?.deactivate();
            clientRef.current = null;
            setIsConnected(false);
            onFailed(msg.errorMessage ?? msg.message ?? '분석 중 오류가 발생했습니다.');
          }
        } catch {
          // JSON 파싱 실패 무시
        }
      }

      const client = new Client({
        brokerURL,
        reconnectDelay: 0,
        onConnect: () => {
          setIsConnected(true);

          // 브로드캐스트 구독
          client.subscribe(
            `/topic/resume/${documentId}/status`,
            (frame) => handleMessage(frame.body),
          );
          // 개인 Snapshot 구독 (재연결 시 현재 상태 즉시 수신)
          client.subscribe(
            `/user/queue/resume/${documentId}/status`,
            (frame) => handleMessage(frame.body),
          );

          // 30초 타임아웃 (NFR-001)
          timeoutRef.current = setTimeout(() => {
            clientRef.current?.deactivate();
            clientRef.current = null;
            setIsConnected(false);
            onFailed('분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
          }, ANALYSIS_TIMEOUT_MS);
        },
        onStompError: (frame) => {
          clearAnalysisTimeout();
          setIsConnected(false);
          onFailed(frame.headers['message'] ?? '서버 오류가 발생했습니다.');
        },
        onWebSocketError: () => {
          clearAnalysisTimeout();
          setIsConnected(false);
          onNetworkError();
          onFailed('네트워크 연결이 끊겼습니다. 연결 상태를 확인 후 다시 시도해주세요.');
        },
        onWebSocketClose: (event) => {
          clearAnalysisTimeout();
          setIsConnected(false);
          // Close 1008: policy violation — 인증 실패 또는 IDOR
          if ((event as CloseEvent).code === 1008) {
            onFailed('접근 권한이 없거나 유효하지 않은 문서입니다.');
          }
        },
      });

      clientRef.current = client;
      client.activate();
    },
    [disconnect, clearAnalysisTimeout, onMessage, onCompleted, onFailed, onNetworkError],
  );

  return { connect, disconnect, isConnected };
}
