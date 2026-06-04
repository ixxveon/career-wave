import { FileText, Mic } from 'lucide-react';
import { Link } from 'react-router-dom';
import { type UsageItem } from '../../types/subscription';
import { PRODUCT_RECOMMEND } from '../../utils/subscription/subscriptionView';

export function RecommendationCard({ item }: { item: UsageItem }) {
  const recommend = PRODUCT_RECOMMEND[item.productCode];

  return (
    <article className={`cw-subscription-recommend-card is-${item.accent}`}>
      <div className="cw-subscription-recommend-card__icon">
        {item.accent === 'document' ? <FileText size={22} /> : <Mic size={22} />}
      </div>
      <div className="cw-subscription-recommend-card__body">
        <span>추천 서비스</span>
        <h3>{item.title}도 함께 시작해보세요</h3>
        <p>{recommend.description}</p>
      </div>
      <Link
        to={`/billing/checkout?product=${item.productCode}`}
        className="cw-subscription-recommend-card__button"
      >
        {recommend.button}
      </Link>
    </article>
  );
}
