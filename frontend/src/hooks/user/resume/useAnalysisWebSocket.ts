import { useRef, useState, useCallback } from 'react';
import type { WsStatusMessage } from '../../../types/user/resume';

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
 * 분석 상태 실시간 구독 WebSocket 훅
 *
 * api-schema.md §5 기준:
 * - COMPLETED 수신 시 onCompleted 콜백 호출 후 연결 종료
 * - FAILED 수신 시 onFailed 콜백 호출 후 연결 종료
 * - Close 1008 (auth/IDOR 에러) 시 onFailed 호출
 * - 30초 타임아웃 초과 시 onFailed 호출 (NFR-001)
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
  const wsRef        = useRef<WebSocket | null>(null);
  const timeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorFiredRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  const clearAnalysisTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cleanupWebSocket = useCallback((ws: WebSocket) => {
    ws.onopen    = null;
    ws.onmessage = null;
    ws.onerror   = null;
    ws.onclose   = null;
  }, []);

  const disconnect = useCallback(() => {
    clearAnalysisTimeout();
    if (wsRef.current) {
      cleanupWebSocket(wsRef.current);
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, [clearAnalysisTimeout, cleanupWebSocket]);

  const connect = useCallback(
    (documentId: string) => {
      // 기존 연결 정리
      clearAnalysisTimeout();
      if (wsRef.current) {
        cleanupWebSocket(wsRef.current);
        wsRef.current.close();
        wsRef.current = null;
      }
      errorFiredRef.current = false;

      // api-schema.md §5: JWT를 쿼리 파라미터로 전달 (?token={accessToken})
      // TODO: 인증 팀원(/user/member) 토큰 관리 방식 확정 후 authSession.getAccessToken()으로 교체 필요
      const token = localStorage.getItem('accessToken');
      const url   = token
        ? `${WS_BASE_URL}/ws/user/resume/${documentId}/status?token=${encodeURIComponent(token)}`
        : `${WS_BASE_URL}/ws/user/resume/${documentId}/status`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      // 30초 타임아웃 — 서버 무응답 시 에러 처리 (NFR-001)
      timeoutRef.current = setTimeout(() => {
        if (wsRef.current === ws) {
          cleanupWebSocket(ws);
          ws.close();
          wsRef.current = null;
          setIsConnected(false);
          onFailed('분석 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        }
      }, ANALYSIS_TIMEOUT_MS);

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: WsStatusMessage = JSON.parse(event.data as string);
          onMessage(msg);

          if (msg.status === 'COMPLETED') {
            clearAnalysisTimeout();
            cleanupWebSocket(ws);
            ws.close();
            wsRef.current = null;
            setIsConnected(false);
            onCompleted();
          } else if (msg.status === 'FAILED') {
            clearAnalysisTimeout();
            cleanupWebSocket(ws);
            ws.close();
            wsRef.current = null;
            setIsConnected(false);
            onFailed(msg.message);
          }
        } catch {
          // JSON 파싱 실패 무시
        }
      };

      // onerror: 네트워크 단절 토스트 + ERROR 상태 전이
      // onerror 이후 onclose가 항상 발화하므로 errorFiredRef로 중복 방지
      ws.onerror = () => {
        clearAnalysisTimeout();
        errorFiredRef.current = true;
        setIsConnected(false);
        onNetworkError();
        onFailed('네트워크 연결이 끊겼습니다. 연결 상태를 확인 후 다시 시도해주세요.');
      };

      ws.onclose = (event: CloseEvent) => {
        clearAnalysisTimeout();
        setIsConnected(false);
        if (errorFiredRef.current) return;
        // Close 1008: policy violation — 인증 실패 또는 IDOR
        if (event.code === 1008) {
          onFailed('접근 권한이 없거나 유효하지 않은 문서입니다.');
        }
      };
    },
    [clearAnalysisTimeout, cleanupWebSocket, onMessage, onCompleted, onFailed, onNetworkError],
  );

  return { connect, disconnect, isConnected };
}
