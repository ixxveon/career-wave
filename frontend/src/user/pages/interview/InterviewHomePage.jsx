import { useNavigate } from 'react-router-dom';
import {
  User, Zap, MessageSquare, Video,
  BarChart2, Lightbulb, FileText, Star,
  ArrowRight, ChevronRight,
} from 'lucide-react';
import './InterviewHomePage.css';

/* ── Mock 데이터 ── */
const MOCK_USER = {
  name:             '이가연',
  resume:           '이력서_최종본.pdf',
  resumeCompletion: 75,
  targetJob:        '백엔드 개발자',
  credits:          12,
};

const MOCK_HISTORY = [
  { id: 1, date: '05-22', type: 'video', company: '토스',   position: '백엔드',  score: 88 },
  { id: 2, date: '05-20', type: 'text',  company: '카카오', position: '백엔드',  score: 75 },
  { id: 3, date: '05-18', type: 'text',  company: '네이버', position: '인턴',    score: 62 },
];

const MOCK_TIP =
  `${MOCK_USER.name}님은 지난 면접에서 '기술적 예외 처리' 답변 시 목소리 떨림이 있었습니다. ` +
  `오늘은 텍스트 모드로 답변 논리 구조를 먼저 뼈대 잡고 시작하는 걸 추천해요!`;

function scoreGrade(score) {
  if (score >= 85) return { label: '우수',   cls: 'A' };
  if (score >= 75) return { label: '양호',   cls: 'B' };
  if (score >= 60) return { label: '보통',   cls: 'C' };
  return               { label: '노력 필요', cls: 'D' };
}

/* ── 첫 방문 (히스토리 없음) ── */
function EmptyState({ onStart }) {
  return (
    <div className="iv-empty">
      <div className="iv-empty__inner">
        <span className="iv-badge">AI INTERVIEW</span>
        <h1>안녕하세요, {MOCK_USER.name}님!<br />첫 면접을 시작해볼까요?</h1>
        <p>AI가 공고와 이력서를 분석해 맞춤 질문을 준비해드려요.<br />텍스트 면접으로 가볍게 시작해보세요.</p>
        <div className="iv-empty__btns">
          <button className="iv-btn iv-btn--primary" onClick={() => onStart('text')} type="button">
            <MessageSquare size={15} /> 텍스트 면접 시작 <ArrowRight size={14} />
          </button>
          <button className="iv-btn iv-btn--outline" onClick={() => onStart('media')} type="button">
            <Video size={14} /> 영상 면접
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 메인 대시보드 ── */
function Dashboard({ onStart }) {
  const u = MOCK_USER;
  const h = MOCK_HISTORY;
  const navigate = useNavigate();

  return (
    <div className="iv-dash">

      {/* ① 인사말 */}
      <div className="iv-greeting">
        <h1>안녕하세요, <em>{u.name}</em>님!&nbsp; 오늘 어떤 면접을 연습해볼까요?</h1>
      </div>

      {/* ② 2단: 준비 상태 + 퀵스타트 */}
      <div className="iv-top-grid">

        {/* 내 준비 상태 */}
        <div className="iv-card iv-status">
          <h2 className="iv-card__title">
            <User size={15} /> 내 준비 상태 요약
          </h2>

          <ul className="iv-status__list">
            <li className="iv-status__item">
              <span className="iv-status__key">연결된 이력서</span>
              <span className="iv-status__val iv-status__val--file">
                <FileText size={13} /> {u.resume}
              </span>
            </li>

            <li className="iv-status__item iv-status__item--bar">
              <span className="iv-status__key">이력서 완성도</span>
              <div className="iv-status__bar-wrap">
                <div className="iv-status__bar">
                  <div
                    className="iv-status__bar-fill"
                    style={{ width: `${u.resumeCompletion}%` }}
                  />
                </div>
                <span className="iv-status__bar-pct">{u.resumeCompletion}%</span>
              </div>
            </li>

            <li className="iv-status__item">
              <span className="iv-status__key">목표 직무</span>
              <span className="iv-status__val">{u.targetJob}</span>
            </li>

            <li className="iv-status__item">
              <span className="iv-status__key">보유 크레딧</span>
              <span className="iv-status__val iv-status__val--credit">
                <Star size={13} /> {u.credits} Credit
              </span>
            </li>
          </ul>
        </div>

        {/* 퀵 스타트 */}
        <div className="iv-card iv-quickstart">
          <h2 className="iv-card__title">
            <Zap size={15} /> 퀵 스타트
          </h2>

          <button
            className="iv-qs-btn iv-qs-btn--text"
            onClick={() => onStart('text')}
            type="button"
          >
            <div className="iv-qs-btn__icon"><MessageSquare size={20} /></div>
            <div className="iv-qs-btn__info">
              <strong>💬 텍스트 면접 시작</strong>
              <span>키보드 타이핑, 메신저 대화 스타일</span>
            </div>
            <ChevronRight size={16} className="iv-qs-btn__arrow" />
          </button>

          <button
            className="iv-qs-btn iv-qs-btn--video"
            onClick={() => onStart('media')}
            type="button"
          >
            <div className="iv-qs-btn__icon"><Video size={20} /></div>
            <div className="iv-qs-btn__info">
              <strong>📹 AI 비디오 면접 시작</strong>
              <span>웹캠 · 마이크 사용, 시선 및 태도 분석</span>
            </div>
            <ChevronRight size={16} className="iv-qs-btn__arrow" />
          </button>
        </div>
      </div>

      {/* ③ 최근 히스토리 테이블 */}
      <div className="iv-card iv-history">
        <h2 className="iv-card__title">
          <BarChart2 size={15} /> 최근 연습 히스토리
          <span className="iv-card__sub">최신 {h.length}개</span>
        </h2>

        <table className="iv-table">
          <thead>
            <tr>
              <th>날짜</th>
              <th>면접 종류</th>
              <th>타겟 기업 / 직무</th>
              <th>점수</th>
              <th>리포트</th>
            </tr>
          </thead>
          <tbody>
            {h.map((item) => {
              const g = scoreGrade(item.score);
              return (
                <tr key={item.id}>
                  <td className="iv-table__date">{item.date}</td>
                  <td>
                    <span className={`iv-tag iv-tag--${item.type}`}>
                      {item.type === 'video' ? '비디오 면접' : '텍스트 면접'}
                    </span>
                  </td>
                  <td className="iv-table__job">
                    {item.company} <span>({item.position})</span>
                  </td>
                  <td>
                    <span className={`iv-score-badge is-${g.cls}`}>
                      {item.score}점
                    </span>
                  </td>
                  <td>
                    <button
                      className="iv-report-btn"
                      onClick={() => navigate('/interview/report')}
                      type="button"
                    >
                      <FileText size={13} /> 결과 보기
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ④ AI 오늘의 팁 배너 */}
      <div className="iv-tip">
        <div className="iv-tip__icon"><Lightbulb size={18} /></div>
        <div className="iv-tip__body">
          <span className="iv-tip__label">오늘의 AI 추천 면접 팁</span>
          <p>{MOCK_TIP}</p>
        </div>
        <button
          className="iv-tip__cta"
          onClick={() => onStart('text')}
          type="button"
        >
          추천 질문 연습하기 <ArrowRight size={14} />
        </button>
      </div>

    </div>
  );
}

/* ── 페이지 진입점 ── */
export default function InterviewHomePage() {
  const navigate   = useNavigate();
  const onStart    = (type) => navigate(`/interview/${type}`);
  const hasHistory = MOCK_HISTORY.length > 0;

  return (
    <div className="iv-home page">
      {hasHistory
        ? <Dashboard onStart={onStart} />
        : <EmptyState onStart={onStart} />
      }
    </div>
  );
}
