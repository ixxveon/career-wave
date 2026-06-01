import { memo } from 'react';
import { Clock } from 'lucide-react';
import './InterviewTimer.css';

interface InterviewTimerProps {
  remaining: number;
  duration: number;
  active: boolean;
}

function formatTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * 문항별 카운트다운 타이머 UI
 * - aria-live="assertive" — 30초 미만 임박 시 스크린 리더 긴급 알림 (constitution.md §7)
 * - memo — 1초마다 타이머 업데이트 시 부모 전체 리렌더링 방지
 */
const InterviewTimer = memo(function InterviewTimer({
  remaining,
  duration,
  active,
}: InterviewTimerProps) {
  if (!active) return null;

  const isUrgent  = remaining <= 30;
  const fillRatio = Math.max(0, remaining / duration);

  return (
    <div
      className={`it${isUrgent ? ' it--urgent' : ''}`}
      aria-live={isUrgent ? 'assertive' : 'off'}
      aria-label={`답변 시간 ${formatTime(remaining)} 남음`}
    >
      <div className="it__track">
        <div className="it__fill" style={{ width: `${fillRatio * 100}%` }} />
      </div>
      <span className="it__label">
        <Clock size={11} />
        {isUrgent && ' ⚠️'}
        {' '}{formatTime(remaining)} 남음
      </span>
    </div>
  );
});

export default InterviewTimer;
