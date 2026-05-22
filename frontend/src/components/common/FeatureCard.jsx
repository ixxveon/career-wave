import './FeatureCard.css';

function FeatureCard({ title, description, icon: Icon }) {
  return (
    <article className="cw-feature-card">
      {Icon && (
        <div className="cw-feature-card__icon">
          <Icon size={24} />
        </div>
      )}
      <h3>{title || 'Feature Title'}</h3>
      <p>{description || 'Short description'}</p>
    </article>
  );
}

export default FeatureCard;
