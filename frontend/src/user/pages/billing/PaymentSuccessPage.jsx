import { CheckCircle2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import './Billing.css';
import { formatPrice, getBillingProduct } from './billingProducts';

function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const product = getBillingProduct(searchParams.get('product') ?? 'document-coaching');

  return (
    <div className="cw-billing-flow-page">
      <div className="cw-billing-flow-shell">
        <div className="cw-billing-card cw-billing-state-card">
          <div className="cw-billing-state-icon" aria-hidden="true">
            <CheckCircle2 size={34} />
          </div>
          <h2>결제가 완료되었습니다.</h2>
          <p>구독 상품을 지금부터 이용할 수 있어요.</p>

          <div className="cw-billing-state-detail">
            <div className="cw-billing-success-detail">
              <span>상품명</span>
              <strong>{product.name}</strong>
            </div>
            <div className="cw-billing-success-detail">
              <span>결제 금액</span>
              <strong>{formatPrice(product.price)}</strong>
            </div>
            <div className="cw-billing-success-detail">
              <span>결제일</span>
              <strong>2026.05.28</strong>
            </div>
            <div className="cw-billing-success-detail">
              <span>다음 결제 예정일</span>
              <strong>2026.06.28</strong>
            </div>
            <div className="cw-billing-success-detail">
              <span>결제 상태</span>
              <strong>결제 완료</strong>
            </div>
            <div className="cw-billing-success-detail">
              <span>결제 유형</span>
              <strong>월 자동 정기 결제</strong>
            </div>
          </div>

          <div className="cw-billing-state-guide">
            <strong>안내</strong>
            <ul>
              <li>다음 결제일부터 매월 자동으로 결제됩니다.</li>
              <li>구독 해지는 마이페이지 &gt; 구독/결제 내역에서 신청할 수 있습니다.</li>
            </ul>
          </div>

          <div className="cw-billing-state-actions">
            <Link className="cw-billing-secondary-button" to="/mypage/subscription">
              AI 서비스로 이동
            </Link>
            <Link className="cw-billing-outline-button" to="/mypage/payment-history">
              구독/결제 내역 보기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccessPage;
