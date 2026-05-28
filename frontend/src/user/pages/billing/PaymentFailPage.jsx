import { AlertTriangle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import './Billing.css';
import { formatPrice, getBillingProduct } from './billingProducts';

function PaymentFailPage() {
  const [searchParams] = useSearchParams();
  const product = getBillingProduct(searchParams.get('product') ?? 'document-coaching');

  return (
    <div className="cw-billing-flow-page">
      <div className="cw-billing-flow-shell">
        <div className="cw-billing-card cw-billing-state-card">
          <div className="cw-billing-state-icon is-fail" aria-hidden="true">
            <AlertTriangle size={34} />
          </div>
          <h2>결제를 완료하지 못했습니다.</h2>
          <p>결제 과정에서 문제가 발생했거나 결제가 취소되었습니다.</p>

          <div className="cw-billing-state-detail">
            <div className="cw-billing-fail-detail">
              <span>상품명</span>
              <strong>{product.name}</strong>
            </div>
            <div className="cw-billing-fail-detail">
              <span>결제 금액</span>
              <strong>{formatPrice(product.price)}</strong>
            </div>
            <div className="cw-billing-fail-detail">
              <span>결제 상태</span>
              <strong>결제 실패</strong>
            </div>
            <div className="cw-billing-fail-detail">
              <span>실패 사유</span>
              <strong>결제 승인이 완료되지 않았습니다.</strong>
            </div>
          </div>

          <div className="cw-billing-state-guide">
            <strong>다시 확인해주세요.</strong>
            <ul>
              <li>결제 수단 정보를 다시 확인해주세요.</li>
              <li>네트워크 상태를 확인한 뒤 다시 시도해주세요.</li>
              <li>문제가 반복되면 고객센터에 문의해주세요.</li>
              <li>결제가 완료되지 않은 경우 구독은 시작되지 않습니다.</li>
            </ul>
          </div>

          <div className="cw-billing-state-actions">
            <Link className="cw-billing-secondary-button" to={`/billing/checkout?product=${product.id}`}>
              다시 결제하기
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

export default PaymentFailPage;
