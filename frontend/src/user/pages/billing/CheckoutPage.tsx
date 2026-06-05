import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Billing.css';
import { useCheckoutStatus } from '../../hooks/subscription/useCheckoutStatus';
import CheckoutProductCard from '../../components/subscription/CheckoutProductCard';
import CheckoutSummaryCard from '../../components/subscription/CheckoutSummaryCard';

function CheckoutPage() {
  const {
    isKnownProduct,
    product,
    agreed,
    warning,
    checkoutError,
    isCreatingOrder,
    handleAgreeChange,
    handleCheckout,
  } = useCheckoutStatus();

  if (!isKnownProduct) {
    return (
      <div className="cw-billing-flow-page">
        <div className="cw-billing-flow-shell">
          <div className="cw-billing-card cw-billing-missing-card">
            <div className="cw-billing-state-icon is-fail" aria-hidden="true">
              <AlertCircle size={30} />
            </div>
            <strong>상품 정보를 확인할 수 없습니다.</strong>
            <p>선택한 상품 정보를 찾을 수 없어요. AI 서비스 페이지로 돌아가 다시 확인해주세요.</p>
            <Link className="cw-billing-outline-button" to="/mypage/subscription">
              AI 서비스로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="cw-billing-flow-page">
        <div className="cw-billing-flow-shell">
          <div className="cw-billing-card cw-billing-missing-card">
            <div className="cw-billing-state-icon is-fail" aria-hidden="true">
              <AlertCircle size={30} />
            </div>
            <strong>상품 정보를 불러오는 중입니다.</strong>
            <p>잠시 후 다시 시도해주세요.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cw-billing-flow-page">
      <div className="cw-billing-flow-shell">
        <header className="cw-billing-flow-header">
          <h1>결제하기</h1>
          <p>구독 상품과 결제 정보를 확인해주세요.</p>
        </header>

        <div className="cw-billing-checkout-layout">
          <CheckoutProductCard product={product} />
          <CheckoutSummaryCard
            product={product}
            agreed={agreed}
            warning={warning}
            checkoutError={checkoutError}
            isCreatingOrder={isCreatingOrder}
            onAgreeChange={handleAgreeChange}
            onCheckout={handleCheckout}
          />
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
