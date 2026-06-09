import { AlertCircle } from 'lucide-react';
import { type PaymentHistorySubscriptionCardItem } from '../../../types/user/subscription';
import { formatBillingDate } from '../../../utils/user/subscription/subscriptionView';

export type { PaymentHistorySubscriptionCardItem };

type PaymentHistorySubscriptionCardProps = {
  subscription: PaymentHistorySubscriptionCardItem;
  isCanceling: boolean;
  onCancel: (subscription: PaymentHistorySubscriptionCardItem) => void;
};

export function PaymentHistorySubscriptionCard({
  subscription,
  isCanceling,
  onCancel,
}: PaymentHistorySubscriptionCardProps) {
  const currentPeriodEnd = formatBillingDate(subscription.currentPeriodEnd);

  return (
    <article className="cw-billing-subscription-card">
      <div className="cw-billing-subscription-card__top">
        <div>
          <h4>{subscription.name}</h4>
          <div className="cw-billing-subscription-card__status-row">
            <span
              className={`cw-billing-subscription-card__badge${
                subscription.cancelScheduled ? ' is-pending' : ''
              }`}
            >
              {subscription.cancelScheduled ? '해지 예약됨' : '이용중'}
            </span>
            {!subscription.cancelScheduled ? (
              <button
                type="button"
                className="cw-billing-subscription-card__cancel"
                onClick={() => onCancel(subscription)}
                disabled={isCanceling}
              >
                구독 해지
              </button>
            ) : (
              <button
                type="button"
                className="cw-billing-subscription-card__cancel is-disabled"
                disabled
              >
                해지 신청 완료
              </button>
            )}
          </div>
        </div>
      </div>

      <dl className="cw-billing-subscription-card__grid">
        <div>
          <dt>자동 결제 상태</dt>
          <dd>{subscription.cancelScheduled ? '자동 결제 해지 예정' : '자동 결제 사용'}</dd>
        </div>
        <div>
          <dt>다음 결제 예정일</dt>
          <dd>{subscription.nextBillingDate ?? '—'}</dd>
        </div>
        <div>
          <dt>결제 주기</dt>
          <dd>{subscription.billingCycle}</dd>
        </div>
        <div>
          <dt>월 결제 금액</dt>
          <dd>{subscription.monthlyPrice}</dd>
        </div>
        <div className="is-wide">
          <dt>구독 시작일</dt>
          <dd>{formatBillingDate(subscription.startedAt)}부터 구독 시작</dd>
        </div>
      </dl>

      {subscription.paymentFailed && (
        <p className="cw-billing-subscription-card__payment-failed" role="alert">
          <AlertCircle size={14} />
          자동 결제에 실패했습니다. 결제 수단을 확인해주세요.
        </p>
      )}

      {subscription.cancelScheduled && (
        <p className="cw-billing-subscription-card__notice">
          {currentPeriodEnd}까지는 계속 사용할 수 있고, 이후부터 자동 결제가 중단됩니다.
        </p>
      )}
    </article>
  );
}
