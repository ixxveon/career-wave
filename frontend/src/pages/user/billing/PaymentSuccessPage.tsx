import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Billing.css';
import { usePaymentSuccessStatus } from '../../../hooks/user/subscription/usePaymentSuccessStatus';
import PaymentSuccessDetail from '../../../components/user/subscription/PaymentSuccessDetail';

function PaymentSuccessPage() {
  const { state } = usePaymentSuccessStatus();

  if (state.phase === 'confirming') {
    return (
      <div className="cw-billing-flow-page">
        <div className="cw-billing-flow-shell">
          <div className="cw-billing-card cw-billing-state-card">
            <div className="cw-billing-state-icon" aria-hidden="true">
              <Loader2 size={34} className="cw-billing-spinner" />
            </div>
            <h2>결제를 확인하고 있습니다.</h2>
            <p>잠시만 기다려주세요. 페이지를 닫거나 새로고침하지 마세요.</p>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'error') {
    return (
      <div className="cw-billing-flow-page">
        <div className="cw-billing-flow-shell">
          <div className="cw-billing-card cw-billing-state-card">
            <div className="cw-billing-state-icon is-fail" aria-hidden="true">
              <AlertTriangle size={34} />
            </div>
            <h2>결제 확인에 실패했습니다.</h2>
            <p>{state.message}</p>
            <div className="cw-billing-state-actions">
              <Link className="cw-billing-secondary-button" to="/mypage/payment-history">
                결제 내역 확인하기
              </Link>
              <Link className="cw-billing-outline-button" to="/mypage/subscription">
                AI 서비스로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cw-billing-flow-page">
      <div className="cw-billing-flow-shell">
        <div className="cw-billing-card cw-billing-state-card">
          <div className="cw-billing-state-icon" aria-hidden="true">
            <CheckCircle2 size={34} />
          </div>
          <h2>결제가 완료되었습니다.</h2>
          <p>구독 상품을 지금부터 이용할 수 있어요.</p>
          <PaymentSuccessDetail data={state.data} />
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccessPage;
