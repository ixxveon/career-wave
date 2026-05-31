import type { FeedbackData } from '../../types/resume.d';
import './FeedbackList.css';

interface FeedbackListProps {
  feedback: FeedbackData;
}

const SECTIONS = [
  { key: 'good' as const, label: '잘한 점',     icon: '👍', mod: 'good' },
  { key: 'bad'  as const, label: '아쉬운 점',   icon: '👎', mod: 'bad'  },
  { key: 'fix'  as const, label: '이렇게 고쳐보세요', icon: '✨', mod: 'fix'  },
] as const;

export default function FeedbackList({ feedback }: FeedbackListProps) {
  return (
    <div className="fl">
      {SECTIONS.map(({ key, label, icon, mod }) => {
        const items = feedback[key];
        return (
          <section key={key} className={`fl-section fl-section--${mod}`}>
            <h3 className="fl-section__title">
              <span aria-hidden="true">{icon}</span> {label}
            </h3>
            {items.length === 0 ? (
              <p className="fl-empty">해당 항목의 피드백이 없습니다.</p>
            ) : (
              <ul className="fl-list">
                {items.map((text, i) => (
                  <li key={i} className="fl-list__item">{text}</li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
