import type { Product } from '../../types/subscription';
import { formatPrice } from '../../utils/subscription/subscriptionView';

interface Props {
  product: Product;
}

function CheckoutProductCard({ product }: Props) {
  return (
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
  );
}

export default CheckoutProductCard;
