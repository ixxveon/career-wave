import { SERVICE_CARDS } from '../../../utils/user/subscription/subscriptionContent';
import { useSubscribedProductCodes } from '../../../hooks/user/subscription';
import { ServiceCard } from './ServiceCard';

export function ServiceCardsSection() {
  const { subscribedCodes } = useSubscribedProductCodes();

  return (
    <section className="cw-subscription-section">
      <div className="cw-subscription-section__head">
        <div>
          <h3>AI 서비스 소개</h3>
          <p>필요한 서비스부터 살펴보고, 상세 상품 페이지에서 이용권을 확인해보세요.</p>
        </div>
      </div>
      <div className="cw-subscription-carousel" role="list">
        {SERVICE_CARDS.map((service) => (
          <ServiceCard
            key={service.key}
            service={service}
            isSubscribed={subscribedCodes.has(service.productCode)}
          />
        ))}
      </div>
    </section>
  );
}
