import type { Product } from '../../types/subscription';
import { formatPrice } from '../../utils/subscription/subscriptionView';

interface Props {
  product: Product;
  agreed: boolean;
  warning: string;
  checkoutError: string;
  isCreatingOrder: boolean;
  isPaymentRequesting: boolean;
  onAgreeChange: (checked: boolean) => void;
  onCheckout: () => void;
}

function CheckoutSummaryCard({ product, agreed, warning, checkoutError, isCreatingOrder, isPaymentRequesting, onAgreeChange, onCheckout }: Props) {
  return (
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
        카드 또는 간편결제를 통해 결제를 진행합니다.
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
          onChange={(e) => onAgreeChange(e.target.checked)}
        />
        <label htmlFor="billing-agreement">매월 자동 정기 결제 및 구독 이용 조건에 동의합니다.</label>
      </div>

      {warning && <p className="cw-billing-inline-warning">{warning}</p>}
      {checkoutError && <p className="cw-billing-inline-warning">{checkoutError}</p>}

      <button
        type="button"
        className="cw-billing-primary-button"
        onClick={onCheckout}
        disabled={isCreatingOrder || isPaymentRequesting}
      >
        {isCreatingOrder || isPaymentRequesting ? '결제 요청 중...' : 'Toss Payments로 결제하기'}
      </button>
    </aside>
  );
}

export default CheckoutSummaryCard;
