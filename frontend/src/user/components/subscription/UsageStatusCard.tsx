import { AlertCircle, CalendarDays, Star } from 'lucide-react';
import { SUBSCRIPTION_STATUS, type UsageItem } from '../../types/subscription';
import { formatBillingDate, formatUsageUnit } from '../../utils/subscription/subscriptionView';

const MAX_USAGE_BOXES = 20;

export function UsageStatusCard({ item }: { item: UsageItem }) {
  const limit = item.usage?.limit ?? 0;
  const used = item.usage?.used ?? 0;
  const remaining = item.usage?.remaining ?? 0;
  const isOverLimit = used > limit;
  const percent = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  const clampedLimit = Math.min(limit, MAX_USAGE_BOXES);
  const usageBoxes = limit > 0 ? Array.from({ length: clampedLimit }, (_, i) => i < used) : [];
  const unit = formatUsageUnit(item.usage?.unit);
  const nextBillingDate = formatBillingDate(item.subscription?.nextBillingAt ?? null);
  const isPaymentFailed = item.subscription?.status === SUBSCRIPTION_STATUS.PAYMENT_FAILED;

  return (
    <article className={`cw-subscription-usage-card is-${item.accent}`}>
      <div className="cw-subscription-usage-card__summary">
        <div className="cw-subscription-usage-card__heading">
          <h3>{item.title}</h3>
          {limit > 0 ? (
            <span className="cw-subscription-usage-card__meta">
              {limit}{unit} 중 {used}{unit} 사용
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
            <dt>다음 결제일</dt>
            <dd>
              <CalendarDays size={13} />
              {nextBillingDate}
            </dd>
          </div>
        </dl>

        {isPaymentFailed && (
          <p className="cw-subscription-usage-card__payment-failed" role="alert">
            <AlertCircle size={14} />
            자동 결제에 실패했습니다. 결제 수단을 확인해주세요.
          </p>
        )}
      </div>
    </article>
  );
}
