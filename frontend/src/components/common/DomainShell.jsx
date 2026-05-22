import FeatureCard from './FeatureCard';
import Button from './Button';
import './DomainShell.css';

function DomainShell({ eyebrow, title, description, cards = [], primaryAction = '시작' }) {
  return (
    <section className="cw-domain-shell">
      <header className="cw-domain-shell__header">
        <div>
          <p className="cw-domain-shell__eyebrow">{eyebrow}</p>
          <h1 className="cw-domain-shell__title">{title || 'Domain'}</h1>
          <p className="cw-domain-shell__description">{description}</p>
        </div>
        <div className="cw-domain-shell__actions">
          <Button>{primaryAction}</Button>
        </div>
      </header>

      <div className="cw-domain-shell__grid">
        {cards.map((card) => (
          <FeatureCard key={card.title} title={card.title} description={card.description} />
        ))}
      </div>
    </section>
  );
}

export default DomainShell;
