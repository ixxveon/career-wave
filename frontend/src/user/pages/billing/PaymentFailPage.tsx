import { AlertTriangle } from 'lucide-react';
import './Billing.css';
import { usePaymentFailStatus } from '../../hooks/subscription/usePaymentFailStatus';
import PaymentFailDetail from '../../components/subscription/PaymentFailDetail';

function PaymentFailPage() {
  const { displayMessage, reasonCode } = usePaymentFailStatus();

  const checkoutUrl = `/billing/checkout`;

  return (
    <div className="cw-billing-flow-page">
      <div className="cw-billing-flow-shell">
        <div className="cw-billing-card cw-billing-state-card">
          <div className="cw-billing-state-icon is-fail" aria-hidden="true">
            <AlertTriangle size={34} />
          </div>
          <h2>결제를 완료하지 못했습니다.</h2>
          <p>결제 과정에서 문제가 발생했거나 결제가 취소되었습니다.</p>
          <PaymentFailDetail
            displayMessage={displayMessage}
            reasonCode={reasonCode}
            checkoutUrl={checkoutUrl}
          />
        </div>
      </div>
    </div>
  );
}

export default PaymentFailPage;
