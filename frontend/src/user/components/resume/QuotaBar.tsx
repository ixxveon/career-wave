import { memo } from 'react';
import { PLAN_LIMITS, MOCK_QUOTA } from '../../utils/resume/quota';
import './QuotaBar.css';

interface QuotaBarProps {
  /** 표시할 라벨 (기본: '이번 달 서류 분석') */
  label?: string;
}

/**
 * 이번 달 서류 분석 사용량 표시 바
 * - 이력서/자기소개서 분석 페이지 공용
 * TODO: 백엔드 quota API 연동 후 MOCK_QUOTA 제거
 */
const QuotaBar = memo(function QuotaBar({ label = '이번 달 서류 분석' }: QuotaBarProps) {
  const { membership, documentUsed } = MOCK_QUOTA;
  const docLimit    = PLAN_LIMITS[membership].document;
  const docLeft     = docLimit - documentUsed;
  const pct         = Math.min((documentUsed / docLimit) * 100, 100);
  const isExhausted = docLeft <= 0;
  const isWarning   = !isExhausted && docLeft <= 3;

  return (
    <div className="qb">
      <div className="qb__info">
        <span className="qb__label">{label}</span>
        <span className={`qb__count${isExhausted ? ' qb__count--full' : isWarning ? ' qb__count--warn' : ''}`}>
          {documentUsed} / {docLimit}회 사용
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
export { PLAN_LIMITS, MOCK_QUOTA };
export type { QuotaBarProps };
