import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import './LoadingModal.css';

interface LoadingModalProps {
  onCancel: () => void;
}

const STEP_MESSAGES = [
  '분석을 준비하고 있어요',
  '파일을 읽고 있어요',
  '키워드를 추출하고 있어요',
  '피드백을 생성하고 있어요',
];
const STEP_INTERVAL_MS = 7_000;

/**
 * AI 분석 로딩 모달
 * constitution.md 상태 머신: ANALYZING 상태일 때만 렌더링
 * 취소 시 서버 취소 API 없음 — WS 연결 끊고 IDLE 복귀
 */
export default function LoadingModal({ onCancel }: LoadingModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    cancelBtnRef.current?.focus();
  }, []);

  // 일정 간격으로 메시지 단계 진행
  useEffect(() => {
    const id = setInterval(() => {
      setStepIndex(prev => Math.min(prev + 1, STEP_MESSAGES.length - 1));
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="lm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lm-title"
      aria-describedby="lm-desc"
    >
      <div className="lm-box">
        <div className="lm-spinner" aria-hidden="true">
          <div className="lm-spinner__ring" />
        </div>

        <p id="lm-title" className="lm-message" aria-live="polite">
          {STEP_MESSAGES[stepIndex]}
        </p>

        {/* 진행률 바 — indeterminate 애니메이션 */}
        <div
          className="lm-progress"
          role="progressbar"
          aria-label="분석 진행 중"
        >
          <div className="lm-progress__fill" style={{ width: '100%' }} />
        </div>

        <p id="lm-desc" className="lm-sub">
          AI가 열심히 분석 중이에요 · 약 30초 소요
        </p>

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
