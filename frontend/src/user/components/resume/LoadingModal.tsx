import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { WsStatusMessage } from '../../types/resume.d';
import './LoadingModal.css';

interface LoadingModalProps {
  /** WebSocket에서 수신한 현재 메시지 (null이면 기본 메시지 표시) */
  wsMessage: WsStatusMessage | null;
  /** 취소 버튼 클릭 시 — constitution: 클라이언트만 WS 닫고 IDLE 복귀 */
  onCancel: () => void;
}

// WebSocket 메시지 없을 때 표시할 기본 단계 메시지
const DEFAULT_STEPS = [
  { threshold: 0,  message: '분석을 준비하고 있어요' },
  { threshold: 10, message: '파일을 읽고 있어요' },
  { threshold: 40, message: '키워드를 추출하고 있어요' },
  { threshold: 70, message: '피드백을 생성하고 있어요' },
];

/**
 * AI 분석 로딩 모달
 *
 * constitution.md 상태 머신: ANALYZING 상태일 때만 렌더링
 * - WebSocket 메시지 기반 단계별 메시지 표시
 * - 취소 시 서버 취소 API 없음 — WS 연결 끊고 IDLE 복귀
 */
export default function LoadingModal({ wsMessage, onCancel }: LoadingModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // 모달 열릴 때 취소 버튼으로 포커스 이동 (a11y)
  useEffect(() => {
    cancelBtnRef.current?.focus();
  }, []);

  const progress = wsMessage?.progress ?? 0;
  const message  = wsMessage?.message
    ?? [...DEFAULT_STEPS].reverse().find(s => progress >= s.threshold)?.message
    ?? DEFAULT_STEPS[0].message;

  return (
    <div
      className="lm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lm-title"
      aria-describedby="lm-desc"
    >
      <div className="lm-box">
        {/* 스피너 */}
        <div className="lm-spinner" aria-hidden="true">
          <div className="lm-spinner__ring" />
        </div>

        {/* 단계 메시지 */}
        <p id="lm-title" className="lm-message" aria-live="polite">
          {message}
        </p>

        {/* 진행률 바 */}
        <div
          className="lm-progress"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`분석 진행률 ${progress}%`}
        >
          <div className="lm-progress__fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="lm-progress__label">{progress}%</p>

        <p id="lm-desc" className="lm-sub">
          AI가 열심히 분석 중이에요 · 약 30초 소요
        </p>

        {/* 취소 버튼 */}
        <button
          ref={cancelBtnRef}
          type="button"
          className="lm-cancel"
          onClick={onCancel}
          aria-label="분석 취소"
        >
          <X size={14} aria-hidden="true" /> 취소
        </button>
      </div>
    </div>
  );
}
