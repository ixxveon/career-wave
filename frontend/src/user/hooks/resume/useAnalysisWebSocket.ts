import { useRef, useState, useCallback } from 'react';
import type { WsStatusMessage } from '../../types/resume.d';

// HTTP(S) → WS(S) 변환, /api 경로 제거
const WS_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)
  ?.replace(/^https/, 'wss')
  ?.replace(/^http/, 'ws')
  ?.replace(/\/api$/, '')
  ?? 'ws://localhost:8080';

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
 * 분석 상태 실시간 구독 WebSocket 훅
 *
 * api-schema.md §5 기준:
 * - COMPLETED 수신 시 onCompleted 콜백 호출 후 연결 종료
 * - FAILED 수신 시 onFailed 콜백 호출 후 연결 종료
 * - Close 1008 (auth/IDOR 에러) 시 onFailed 호출
 *
 * TODO: JWT 토큰 연동 — 백엔드 인증 방식 확정 후
 * `?token={accessToken}` 쿼리 파라미터 추가 필요
 */
export function useAnalysisWebSocket({
  onMessage,
  onCompleted,
  onFailed,
  onNetworkError,
}: UseAnalysisWebSocketOptions): UseAnalysisWebSocketReturn {
  const wsRef           = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const connect = useCallback(
    (documentId: string) => {
      // 기존 연결 정리
      wsRef.current?.close();

      const url = `${WS_BASE_URL}/ws/resume/${documentId}/status`;
      const ws  = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: WsStatusMessage = JSON.parse(event.data as string);
          onMessage(msg);

          if (msg.status === 'COMPLETED') {
            setIsConnected(false);
            wsRef.current = null;
            onCompleted();
          } else if (msg.status === 'FAILED') {
            setIsConnected(false);
            wsRef.current = null;
            onFailed(msg.message);
          }
        } catch {
          // JSON 파싱 실패 무시
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        onNetworkError();
      };

      ws.onclose = (event: CloseEvent) => {
        setIsConnected(false);
        // Close 1008: policy violation — 인증 실패 또는 IDOR
        if (event.code === 1008) {
          onFailed('접근 권한이 없거나 유효하지 않은 문서입니다.');
        }
      };
    },
    [onMessage, onCompleted, onFailed, onNetworkError],
  );

  return { connect, disconnect, isConnected };
}
