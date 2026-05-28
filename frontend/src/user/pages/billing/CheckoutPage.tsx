import { useMemo, useState } from 'react';
import { AlertCircle, BadgeCheck, CreditCard, RotateCcw } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import './Billing.css';
import { formatPrice, getBillingProduct } from './billingProducts';

function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [warning, setWarning] = useState('');

  const requestedProduct = searchParams.get('product');
  const isKnownProduct = requestedProduct ? ['document-coaching', 'interview'].includes(requestedProduct) : true;
  const product = useMemo(() => getBillingProduct(requestedProduct ?? 'document-coaching'), [requestedProduct]);

  function handleCheckout() {
    if (!agreed) {
      setWarning('자동 정기 결제 및 이용 조건에 동의해주세요.');
      return;
    }

    setWarning('');
    navigate(`/billing/success?product=${product.id}`);
  }

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

  return (
    <div className="cw-billing-flow-page">
      <div className="cw-billing-flow-shell">
        <header className="cw-billing-flow-header">
          <h1>결제하기</h1>
          <p>구독 상품과 결제 정보를 확인해주세요.</p>
        </header>

        <div className="cw-billing-checkout-layout">
          <section className="cw-billing-card cw-billing-product-card">
            <span className="cw-billing-product-card__eyebrow">월 정기 구독</span>
            <h3>{product.name}</h3>
            <div className="cw-billing-product-card__price">
              <strong>{formatPrice(product.price)}</strong>
              <span>/ 월</span>
            </div>

            <div className="cw-billing-product-card__meta">
              <div className="cw-billing-product-card__meta-item">
                <span>결제 유형</span>
                <strong>매월 자동 정기 결제</strong>
              </div>
              <div className="cw-billing-product-card__meta-item">
                <span>결제 수단</span>
                <strong>Toss Payments</strong>
              </div>
              <div className="cw-billing-product-card__meta-item">
                <span>구독 해지</span>
                <strong>마이페이지 &gt; 구독/결제 내역</strong>
              </div>
            </div>
          </section>

          <aside className="cw-billing-card cw-billing-summary-card">
            <span className="cw-billing-summary-card__eyebrow">결제 요약</span>
            <div className="cw-billing-summary-card__rows">
              <div className="cw-billing-summary-row">
                <span>상품 금액</span>
                <strong>{formatPrice(product.price)}</strong>
              </div>
              <div className="cw-billing-summary-row">
                <span>할인 금액</span>
                <strong>₩0</strong>
              </div>
              <div className="cw-billing-summary-row is-total">
                <span>총 결제 금액</span>
                <strong>{formatPrice(product.price)}</strong>
              </div>
            </div>

            <div className="cw-billing-summary-method">
              <strong>Toss Payments 결제</strong>
              카드 또는 간편결제 정보를 통해 결제를 진행합니다. 실제 결제창 호출은 추후 API 연동 시 연결됩니다.
            </div>

            <ul className="cw-billing-summary-note">
              <li>매월 결제일에 자동으로 정기 결제됩니다.</li>
              <li>결제일은 최초 결제 완료일을 기준으로 설정됩니다.</li>
              <li>구독 해지는 마이페이지 &gt; 구독/결제 내역에서 신청할 수 있습니다.</li>
              <li>구독을 해지하면 다음 결제일부터 자동 결제가 중단됩니다.</li>
            </ul>

            <div className="cw-billing-consent">
              <input
                id="billing-agreement"
                type="checkbox"
                checked={agreed}
                onChange={(event) => {
                  setAgreed(event.target.checked);
                  if (event.target.checked) setWarning('');
                }}
              />
              <label htmlFor="billing-agreement">매월 자동 정기 결제 및 구독 이용 조건에 동의합니다.</label>
            </div>

            {warning && <p className="cw-billing-inline-warning">{warning}</p>}

            <button type="button" className="cw-billing-primary-button" onClick={handleCheckout}>
              Toss Payments로 결제하기
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
