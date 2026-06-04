import { CalendarDays, Star } from 'lucide-react';
import { formatBillingDate, type UsageItem } from '../../utils/subscription/subscriptionView';

export function UsageStatusCard({ item }: { item: UsageItem }) {
  const limit = item.usage?.limit ?? 0;
  const used = item.usage?.used ?? 0;
  const remaining = item.usage?.remaining ?? 0;
  const isOverLimit = used > limit;
  const percent = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  const usageBoxes = limit > 0 ? Array.from({ length: limit }, (_, i) => i < used) : [];
  const nextBillingDate = formatBillingDate(item.subscription?.nextBillingAt ?? null);

  return (
    <article className={`cw-subscription-usage-card is-${item.accent}`}>
      <div className="cw-subscription-usage-card__summary">
        <div className="cw-subscription-usage-card__heading">
          <h3>{item.title}</h3>
          {limit > 0 ? (
            <span className="cw-subscription-usage-card__meta">
              {limit}회 중 {used}회 사용
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
            <dd>{limit > 0 ? (isOverLimit ? '초과' : `${remaining}회`) : '—'}</dd>
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
      </div>
    </article>
  );
}
