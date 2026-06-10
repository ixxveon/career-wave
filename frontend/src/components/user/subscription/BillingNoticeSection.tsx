import { Info } from 'lucide-react';
import { BILLING_NOTICE_ITEMS } from '../../../utils/user/subscription/subscriptionContent';

export function BillingNoticeSection() {
  return (
    <section className="cw-subscription-notice-card cw-billing-notice">
      <div className="cw-subscription-notice-card__title">
        <span>
          <Info size={18} />
        </span>
        <h4>결제내역 유의사항</h4>
      </div>
      <ul>
        {BILLING_NOTICE_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
