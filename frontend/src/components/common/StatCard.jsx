import './StatCard.css';

function StatCard({ title, value, unit, description, icon: Icon }) {
  return (
    <article className="cw-stat-card">
      <div>
        <p className="cw-stat-card__title">{title || 'Metric'}</p>
        <strong className="cw-stat-card__value">
          {value ?? '--'}
          {unit && <span>{unit}</span>}
        </strong>
        <p className="cw-stat-card__description">{description || ''}</p>
      </div>

      {Icon && (
        <div className="cw-stat-card__icon">
          <Icon size={20} />
        </div>
      )}
    </article>
  );
}

export default StatCard;
