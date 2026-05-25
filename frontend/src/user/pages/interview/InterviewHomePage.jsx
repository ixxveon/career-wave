import { FileText, Video, ChevronRight, Star } from 'lucide-react';
import './InterviewHomePage.css';

const mockHistory = [
  { date: '05-22', type: '비디오 면접', target: '토스 (백엔드)', score: 88 },
  { date: '05-20', type: '텍스트 면접', target: '카카오 (백엔드)', score: 75 },
  { date: '05-18', type: '텍스트 면접', target: '네이버 (인턴)', score: 62 },
];

function InterviewHomePage() {
  return (
    <div className="iv-home">

      {/* Hero */}
      <section className="iv-hero">
        <div className="iv-hero__left">
          <p className="iv-hero__eyebrow">AI INTERVIEW</p>
          <h1 className="iv-hero__title">
            안녕하세요, OOO님!<br />
            오늘 어떤 면접을 연습해볼까요?
          </h1>
          <p className="iv-hero__sub">AI가 이력서와 공고를 분석해 맞춤 질문을 실시간으로 생성합니다.</p>
        </div>
        <div className="iv-hero__right">
          <div className="iv-hero__stat">
            <span className="iv-hero__stat-value">88점</span>
            <span className="iv-hero__stat-label">최근 면접 점수</span>
          </div>
          <div className="iv-hero__stat">
            <span className="iv-hero__stat-value">3회</span>
            <span className="iv-hero__stat-label">이번 달 연습</span>
          </div>
          <div className="iv-hero__stat">
            <span className="iv-hero__stat-value">12</span>
            <span className="iv-hero__stat-label">보유 크레딧</span>
          </div>
        </div>
      </section>

      {/* Status + Quick Start */}
      <div className="iv-grid-2">

        {/* 내 준비 상태 */}
        <div className="iv-card">
          <h2 className="iv-card__title">
            <span className="iv-card__icon-wrap iv-card__icon-wrap--blue">👤</span>
            내 준비 상태 요약
          </h2>
          <ul className="iv-status-list">
            <li className="iv-status-item">
              <span className="iv-status-item__label">연결된 이력서</span>
              <span className="iv-status-item__value iv-status-item__value--file">
                📄 이력서_최종본.pdf
              </span>
            </li>
            <li className="iv-status-item">
              <span className="iv-status-item__label">이력서 완성도</span>
              <div className="iv-progress-wrap">
                <div className="iv-progress">
                  <div className="iv-progress__bar" style={{ width: '75%' }} />
                </div>
                <span className="iv-status-item__value">75%</span>
              </div>
            </li>
            <li className="iv-status-item">
              <span className="iv-status-item__label">목표 직무</span>
              <span className="iv-status-item__value">백엔드 개발자</span>
            </li>
            <li className="iv-status-item">
              <span className="iv-status-item__label">보유 크레딧</span>
              <span className="iv-status-item__value iv-status-item__value--credit">⭐ 12 Credit</span>
            </li>
          </ul>
        </div>

        {/* 퀵 스타트 */}
        <div className="iv-card">
          <h2 className="iv-card__title">
            <span className="iv-card__icon-wrap iv-card__icon-wrap--yellow">⚡</span>
            퀵 스타트
            <span className="iv-card__subtitle">면접 바로 시작하기</span>
          </h2>
          <div className="iv-qs-list">
            <button className="iv-qs-btn iv-qs-btn--light">
              <div className="iv-qs-btn__icon">
                <FileText size={24} />
              </div>
              <strong className="iv-qs-btn__title">텍스트 면접 시작</strong>
              <span className="iv-qs-btn__desc">키보드 타이핑, 메신저 대화 스타일</span>
              <span className="iv-qs-btn__cta">바로 시작하기 <ChevronRight size={14} /></span>
            </button>
            <button className="iv-qs-btn iv-qs-btn--dark">
              <div className="iv-qs-btn__icon">
                <Video size={24} />
              </div>
              <strong className="iv-qs-btn__title">AI 비디오 면접 시작</strong>
              <span className="iv-qs-btn__desc">웹캠/마이크 사용, 시선 및 태도 분석</span>
              <span className="iv-qs-btn__cta">바로 시작하기 <ChevronRight size={14} /></span>
            </button>
          </div>
        </div>
      </div>

      {/* 최근 히스토리 */}
      <div className="iv-card">
        <h2 className="iv-card__title">
          <span className="iv-card__icon-wrap iv-card__icon-wrap--green">📊</span>
          최근 연습 히스토리
          <span className="iv-card__subtitle">가장 최신 기록 3개</span>
        </h2>
        <table className="iv-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>면접 종류</th>
              <th>타겟 기업/직무</th>
              <th>점수</th>
              <th>리포트</th>
            </tr>
          </thead>
          <tbody>
            {mockHistory.map((row) => (
              <tr key={row.date}>
                <td className="iv-table__date">{row.date}</td>
                <td>
                  <span className={`iv-badge ${row.type.includes('비디오') ? 'iv-badge--video' : 'iv-badge--text'}`}>
                    {row.type}
                  </span>
                </td>
                <td>{row.target}</td>
                <td>
                  <span className={`iv-score ${row.score >= 80 ? 'iv-score--high' : row.score >= 70 ? 'iv-score--mid' : 'iv-score--low'}`}>
                    {row.score}점
                  </span>
                </td>
                <td>
                  <button className="iv-report-btn">결과 보기</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AI 추천 팁 */}
      <div className="iv-tip">
        <div className="iv-tip__icon">
          <Star size={18} />
        </div>
        <div className="iv-tip__body">
          <p className="iv-tip__label">오늘의 AI 추천 면접 팁</p>
          <p className="iv-tip__text">
            OOO님은 지난 면접에서 <strong>'기술적 예외 처리'</strong> 답변 시 목소리 떨림이 있었습니다.<br />
            오늘은 텍스트 모드로 답변 논리 구조를 먼저 배대 잡고 시작하는 걸 추천해요!
          </p>
          <button className="iv-tip__cta">추천 질문 연습하기 →</button>
        </div>
      </div>

    </div>
  );
}

export default InterviewHomePage;
