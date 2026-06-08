import { NOTICE_SECTIONS } from '../../../utils/user/subscription/subscriptionContent';

export function NoticeSectionsGrid() {
  return (
    <section className="cw-subscription-notice-grid">
      {NOTICE_SECTIONS.map((section) => {
        const SectionIcon = section.icon;
        return (
          <article className="cw-subscription-notice-card" key={section.title}>
            <div className="cw-subscription-notice-card__title">
              <span>
                <SectionIcon size={18} />
              </span>
              <h4>{section.title}</h4>
            </div>
            <ul>
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        );
      })}
    </section>
  );
}
