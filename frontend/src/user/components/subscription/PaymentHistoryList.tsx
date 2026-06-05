import type { PaymentHistory } from '../../types/subscription';
import { formatBillingDate, formatPaymentStatus, formatPrice } from '../../utils/subscription/subscriptionView';

export function PaymentHistoryList({ payments }: { payments: PaymentHistory[] }) {
  return (
    <div className="cw-billing-payment-list">
      <div className="cw-billing-payment-list__head">
        <span>상품명</span>
        <span>결제일</span>
        <span>결제 금액</span>
        <span>상태</span>
      </div>

      {payments.map((payment) => {
        const { label, variant } = formatPaymentStatus(payment.paymentStatus);
        return (
          <article className="cw-billing-payment-item" key={payment.paymentId}>
            <div className="cw-billing-payment-item__cell is-product">
              <small>상품명</small>
              <strong>{payment.productName}</strong>
            </div>
            <div className="cw-billing-payment-item__cell">
              <small>결제일</small>
              <strong>{formatBillingDate(payment.paidAt)}</strong>
            </div>
            <div className="cw-billing-payment-item__cell">
              <small>결제 금액</small>
              <strong>{formatPrice(payment.amount)}</strong>
            </div>
            <div className="cw-billing-payment-item__cell">
              <small>상태</small>
              <span className={`cw-billing-payment-status is-${variant}`}>{label}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
