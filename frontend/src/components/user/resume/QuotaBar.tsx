import { memo } from 'react';
import { useResumeQuota } from '../../../hooks/user/resume/useResumeQuota';
import './QuotaBar.css';

interface QuotaBarProps {
  label?: string;
}

const QuotaBar = memo(function QuotaBar({ label = '이번 달 서류 분석' }: QuotaBarProps) {
  const { data } = useResumeQuota();

  const usedCount  = data?.usedCount  ?? 0;
  const limitCount = data?.limitCount ?? 30;
  const docLeft    = Math.max(limitCount - usedCount, 0);
  const pct        = limitCount > 0 ? Math.min((usedCount / limitCount) * 100, 100) : 100;
  const isExhausted = docLeft <= 0;
  const isWarning   = !isExhausted && docLeft <= 3;

  return (
    <div className="qb">
      <div className="qb__info">
        <span className="qb__label">{label}</span>
        <span className={`qb__count${isExhausted ? ' qb__count--full' : isWarning ? ' qb__count--warn' : ''}`}>
          {usedCount} / {limitCount}회 사용
          {isExhausted && <span className="qb__tag">한도 초과</span>}
          {isWarning   && <span className="qb__tag qb__tag--warn">잔여 {docLeft}회</span>}
        </span>
      </div>
      <div className="qb__track">
        <div
          className={`qb__fill${isExhausted ? ' qb__fill--full' : pct >= 70 ? ' qb__fill--warn' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
});

export default QuotaBar;
export type { QuotaBarProps };
