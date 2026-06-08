import { CheckCircle2, FileText, MessageSquareMore, Mic, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SERVICE_CARDS } from '../../../utils/user/subscription/subscriptionContent';

type ServiceCardItem = (typeof SERVICE_CARDS)[number];

export function ServiceCard({ service }: { service: ServiceCardItem }) {
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
        <Link to={service.href} className="cw-subscription-service-card__button">
          구매하기
        </Link>
      </div>

      <p className="cw-subscription-service-card__footer">
        <CheckCircle2 size={16} />
        <span>{service.footer}</span>
      </p>
    </article>
  );
}
