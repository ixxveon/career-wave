import { BadgeCheck, CheckCircle2, FileText, MessageSquareMore, Mic, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SERVICE_CARDS } from '../../../utils/user/subscription/subscriptionContent';

type ServiceCardItem = (typeof SERVICE_CARDS)[number];

export function ServiceCard({
  service,
  isSubscribed = false,
}: {
  service: ServiceCardItem;
  isSubscribed?: boolean;
}) {
  return (
    <article
      className={`cw-subscription-service-card is-${service.accent}`}
      key={service.key}
      role="listitem"
    >
      <div className="cw-subscription-service-card__hero">
        <div className="cw-subscription-service-card__copy">
          <h4>{service.title}</h4>
          <p>{service.description}</p>
        </div>
        <div className={`cw-subscription-service-card__visual is-${service.key}`}>
          {service.key === 'document' ? (
            <>
              <div className="cw-subscription-service-card__visual-doc">
                <FileText size={18} />
              </div>
              <div className="cw-subscription-service-card__visual-cloud">?</div>
              <div className="cw-subscription-service-card__visual-main is-bubble">
                <MessageSquareMore size={34} />
              </div>
            </>
          ) : (
            <>
              <div className="cw-subscription-service-card__visual-chat is-middle">
                <Mic size={28} />
              </div>
              <div className="cw-subscription-service-card__visual-chat is-bottom">
                <Sparkles size={18} />
              </div>
            </>
          )}
        </div>
      </div>

      <ul>
        {service.bullets.map((bullet) => (
          <li key={bullet}>
            <CheckCircle2 size={15} />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      <div className="cw-subscription-service-card__features">
        {service.highlights.map((highlight) => (
          <div key={highlight}>
            <strong>{highlight}</strong>
          </div>
        ))}
      </div>

      <div className="cw-subscription-service-card__cta-wrap">
        {isSubscribed ? (
          // 이미 구독 중인 상품은 결제 진입을 막고, 이용 현황으로 안내한다. (이슈 #1007)
          <a
            href="#cw-my-usage"
            className="cw-subscription-service-card__button is-subscribed"
            aria-label={`${service.title} 구독중 · 이용 현황 관리하기`}
          >
            <BadgeCheck size={16} />
            구독중 · 관리하기
          </a>
        ) : (
          <Link to={service.href} className="cw-subscription-service-card__button">
            구매하기
          </Link>
        )}
      </div>

      <p className="cw-subscription-service-card__footer">
        <CheckCircle2 size={16} />
        <span>{service.footer}</span>
      </p>
    </article>
  );
}
