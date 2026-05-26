import { CheckCircle2, Circle, Clock, FileText, ChevronRight, Building2 } from 'lucide-react';
import './styles/ApplicationStatusPage.css';

const MOCK_APPLICATIONS = [
  {
    id: 1, company: '토스', title: '백엔드 개발자', appliedAt: '2025-05-10',
    stage: 3, result: null,
    history: [
      { stage: '서류 접수', date: '2025-05-10', done: true  },
      { stage: '서류 합격', date: '2025-05-18', done: true  },
      { stage: '면접 대기', date: '2025-05-22', done: true  },
      { stage: '최종 결과', date: null,         done: false },
    ],
  },
  {
    id: 2, company: '카카오', title: '프론트엔드 개발자', appliedAt: '2025-05-05',
    stage: 4, result: 'pass',
    history: [
      { stage: '서류 접수', date: '2025-05-05', done: true },
      { stage: '서류 합격', date: '2025-05-12', done: true },
      { stage: '면접 대기', date: '2025-05-17', done: true },
      { stage: '최종 결과', date: '2025-05-24', done: true },
    ],
  },
  {
    id: 3, company: '네이버', title: '클라우드 엔지니어', appliedAt: '2025-05-15',
    stage: 1, result: null,
    history: [
      { stage: '서류 접수', date: '2025-05-15', done: true  },
      { stage: '서류 합격', date: null,         done: false },
      { stage: '면접 대기', date: null,         done: false },
      { stage: '최종 결과', date: null,         done: false },
    ],
  },
];

function ResultBadge({ result, stage }) {
  if (result === 'pass') return <span className="as-badge as-badge--pass">최종 합격</span>;
  if (result === 'fail') return <span className="as-badge as-badge--fail">불합격</span>;
  if (stage >= 3)        return <span className="as-badge as-badge--progress">면접 진행 중</span>;
  return                        <span className="as-badge as-badge--wait">검토 중</span>;
}

export default function ApplicationStatusPage() {
  return (
    <div className="as-page">
      <div className="as-header">
        <span className="as-eyebrow">MY APPLICATIONS</span>
        <h1 className="as-header__title">지원 현황</h1>
        <p className="as-header__desc">지원한 공고의 전형 단계를 실시간으로 확인합니다.</p>
      </div>

      <div className="as-summary">
        <div className="as-summary__item">
          <span className="as-summary__value">{MOCK_APPLICATIONS.length}</span>
          <span className="as-summary__label">총 지원</span>
        </div>
        <div className="as-summary__item">
          <span className="as-summary__value">{MOCK_APPLICATIONS.filter(a => a.result === 'pass').length}</span>
          <span className="as-summary__label">합격</span>
        </div>
        <div className="as-summary__item">
          <span className="as-summary__value">{MOCK_APPLICATIONS.filter(a => !a.result).length}</span>
          <span className="as-summary__label">진행 중</span>
        </div>
      </div>

      <div className="as-list">
        {MOCK_APPLICATIONS.map(app => (
          <div key={app.id} className="as-card">
            <div className="as-card__top">
              <div className="as-card__logo">{app.company[0]}</div>
              <div className="as-card__info">
                <p className="as-card__company">{app.company}</p>
                <p className="as-card__title">{app.title}</p>
                <p className="as-card__date"><Clock size={11} /> 지원일 {app.appliedAt}</p>
              </div>
              <ResultBadge result={app.result} stage={app.stage} />
            </div>

            <div className="as-timeline">
              {app.history.map((h, i) => (
                <div key={i} className={`as-timeline__step${h.done ? ' as-timeline__step--done' : i + 1 === app.stage ? ' as-timeline__step--cur' : ''}`}>
                  <div className="as-timeline__dot">
                    {h.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </div>
                  {i < app.history.length - 1 && <div className="as-timeline__line" />}
                  <div className="as-timeline__label">
                    <span>{h.stage}</span>
                    {h.date && <span className="as-timeline__date">{h.date}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="as-card__actions">
              <button className="as-action-btn"><FileText size={13} /> 지원서 보기</button>
              <button className="as-action-btn"><Building2 size={13} /> 기업 정보</button>
              <button className="as-action-btn as-action-btn--primary">상세 보기 <ChevronRight size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
