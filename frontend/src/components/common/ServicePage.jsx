import { ArrowRight, CheckCircle2 } from 'lucide-react';
import './ServicePage.css';

function ServicePage({
  eyebrow,
  title,
  description,
  primaryAction = '시작하기',
  secondaryAction = '자세히 보기',
  metrics = [],
  cards = [],
  steps = [],
}) {
  return (
    <section className="cw-service-page">
      <header className="cw-service-hero">
        <div>
          {eyebrow && <p className="cw-service-hero__eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="cw-service-hero__actions">
            <button type="button">{primaryAction}</button>
            <button type="button">{secondaryAction}</button>
          </div>
        </div>

        <div className="cw-service-summary">
          {metrics.map((metric) => (
            <span key={metric.label}>
              <strong>{metric.value}</strong>
              {metric.label}
            </span>
          ))}
        </div>
      </header>

      <div className="cw-service-grid">
        {cards.map(({ icon: Icon, title: cardTitle, text }) => (
          <article className="cw-service-card" key={cardTitle}>
            {Icon && (
              <span>
                <Icon size={22} />
              </span>
            )}
            <h2>{cardTitle}</h2>
            <p>{text}</p>
            <a href="#">
              바로가기
              <ArrowRight size={16} />
            </a>
          </article>
        ))}
      </div>

      {steps.length > 0 && (
        <section className="cw-service-flow">
          <h2>이용 흐름</h2>
          <div>
            {steps.map((step) => (
              <p key={step}>
                <CheckCircle2 size={18} />
                {step}
              </p>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

export default ServicePage;
