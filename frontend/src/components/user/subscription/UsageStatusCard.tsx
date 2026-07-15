import { AlertCircle, CalendarDays, Star } from 'lucide-react';
import { SUBSCRIPTION_STATUS, type UsageItem } from '../../../types/user/subscription';
import { formatBillingDate, formatUsageUnit } from '../../../utils/user/subscription/subscriptionView';

const MAX_USAGE_BOXES = 30;

export function UsageStatusCard({ item }: { item: UsageItem }) {
  const limit = item.usage?.limit ?? 0;
  const remaining = item.usage?.remaining ?? 0;
  // reserved(분석 중) 포함 실제 차감 횟수 = limit - remaining
  const consumedCount = limit > 0 ? Math.max(limit - remaining, 0) : 0;
  const isOverLimit = consumedCount > limit;
  const percent = limit > 0 ? Math.min(Math.round((consumedCount / limit) * 100), 100) : 0;
  const clampedLimit = Math.min(limit, MAX_USAGE_BOXES);
  const clampedUsed = limit > 0 ? Math.min(Math.max(consumedCount, 0), limit) : 0;
  const filledBoxes =
    limit > 0 ? Math.min(Math.round((clampedUsed / limit) * clampedLimit), clampedLimit) : 0;
  const usageBoxes = limit > 0 ? Array.from({ length: clampedLimit }, (_, i) => i < filledBoxes) : [];
  const unit = formatUsageUnit(item.usage?.unit);
  const isPaymentFailed = item.subscription?.status === SUBSCRIPTION_STATUS.PAYMENT_FAILED;
  const isCancelScheduled = item.subscription?.status === SUBSCRIPTION_STATUS.CANCEL_SCHEDULED;
  // 해지 예정 상태는 더 이상 결제가 없으므로 "다음 결제일"이 아니라 "이용 종료일" 의미의
  // currentPeriodEnd를 봐야 한다 (formatSubscriptionStatusLabel과 동일한 출처로 통일).
  const periodEndDate = formatBillingDate(
    isCancelScheduled
      ? item.subscription?.currentPeriodEnd ?? null
      : item.subscription?.nextBillingAt ?? null,
  );

  return (
    <article className={`cw-subscription-usage-card is-${item.accent}`}>
      <div className="cw-subscription-usage-card__summary">
        <div className="cw-subscription-usage-card__heading">
          <h3>{item.title}</h3>
          {limit > 0 ? (
            <span className="cw-subscription-usage-card__meta">
              {limit}{unit} 중 {consumedCount}{unit} 사용
            </span>
          ) : (
            <span className="cw-subscription-usage-card__meta">사용량 정보 준비 중</span>
          )}
        </div>
        <strong>{percent}%</strong>
      </div>

      <div className="cw-subscription-usage-card__body">
        {limit > 0 && (
          <div className="cw-subscription-usage-track" aria-hidden="true">
            {usageBoxes.map((filled, index) => (
              <span key={`${item.key}-${index}`} className={filled ? 'is-filled' : ''}>
                <Star size={18} fill="currentColor" strokeWidth={1.8} />
              </span>
            ))}
          </div>
        )}

        <dl className="cw-subscription-usage-stats">
          <div>
            <dt>남은 횟수</dt>
            <dd>{limit > 0 ? (isOverLimit ? '초과' : `${remaining}${unit}`) : '—'}</dd>
          </div>
          <div>
            <dt>사용률</dt>
            <dd>{limit > 0 ? `${percent}%` : '—'}</dd>
          </div>
          <div>
            <dt>{isCancelScheduled ? '이용 종료일' : '다음 결제일'}</dt>
            <dd>
              <CalendarDays size={13} />
              {periodEndDate}
            </dd>
          </div>
        </dl>

        {isPaymentFailed && (
          <p className="cw-subscription-usage-card__payment-failed" role="alert">
            <AlertCircle size={14} />
            자동 결제에 실패했습니다. 결제 수단을 확인해주세요.
          </p>
        )}

        {isCancelScheduled && (
          <p className="cw-subscription-usage-card__cancel-scheduled" role="status">
            <CalendarDays size={14} />
            {periodEndDate}까지 이용 가능하며, 이후 자동 결제가 중단됩니다.
          </p>
        )}
      </div>
    </article>
  );
}
