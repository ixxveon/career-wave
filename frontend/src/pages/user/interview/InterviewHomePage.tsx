import { useNavigate, Link } from 'react-router-dom';
import '@/styles/user/interview/InterviewHomePage.css';
import {
  MessageSquare, ChevronRight,
  User, Zap, ClipboardList, Loader2,
} from 'lucide-react';
import { useInterviewHistory } from '../../../hooks/user/interview/useInterviewReport';
import { useSubscriptionStatus } from '../../../hooks/user/subscription';
import { useResumeQuota } from '../../../hooks/user/resume/useResumeQuota';
import { SESSION_TYPE_LABEL } from '../../../constants/user/interview';

/* ── 상품별 월 이용 한도 기본값 (API 미구독 시 fallback) */
const DEFAULT_DOC_LIMIT = 30;
const DEFAULT_IV_LIMIT  = 20;

function scoreClass(s: number): string {
  return s >= 80 ? 'iv-score--high' : s >= 65 ? 'iv-score--mid' : 'iv-score--low';
}


function InterviewHomePage() {
  const navigate = useNavigate();
  const { data: historyData, isLoading: historyLoading, isError: historyError, refetch: refetchHistory } = useInterviewHistory(0, 3);
  const { subscribedItems, unsubscribedItems } = useSubscriptionStatus();
  const { data: resumeQuota } = useResumeQuota();

  /* 서류 AI 코칭 / AI 모의면접 usage 항목 (구독 여부 무관) */
  const allSubItems = [...subscribedItems, ...unsubscribedItems];
  const ivItem  = allSubItems.find(i => i.key === 'interview');

  const docItem = allSubItems.find(i => i.key === 'document');

  // 서류 분석 사용량은 resume/quota API 기준 (ResumeAnalysisPage와 동일)
  const docUsed  = resumeQuota?.usedCount  ?? 0;
  const docLimit = resumeQuota?.limitCount ?? DEFAULT_DOC_LIMIT;
  const ivLimit  = ivItem?.usage?.limit  ?? DEFAULT_IV_LIMIT;
  const ivUsed   = ivItem?.usage ? Math.max(ivLimit - (ivItem.usage.remaining ?? 0), 0) : 0;

  const docPct = Math.min((docUsed / docLimit) * 100, 100);
  const ivPct  = Math.min((ivUsed  / ivLimit)  * 100, 100);

  const docSubscribed = docItem?.isSubscribed ?? false;
  const ivSubscribed  = ivItem?.isSubscribed  ?? false;

  return (
    <div className="iv-home">
      {/* ── Hero ── */}
      <section className="iv-hero">
        <div className="iv-hero__deco iv-hero__deco--1" />
        <div className="iv-hero__deco iv-hero__deco--2" />

        <div className="iv-hero__left">
          <span className="iv-hero__eyebrow">AI INTERVIEW</span>
          <h1 className="iv-hero__title">
            안녕하세요!<br />
            오늘 어떤 면접을 연습할까요?
          </h1>
          <p className="iv-hero__sub">
            AI가 이력서와 타겟 공고를 분석해 맞춤 질문을 실시간 생성합니다.
          </p>
        </div>

        <div className="iv-hero__stats">
          <div className="iv-stat">
            <span className="iv-stat__value">
              {(() => {
                const scores = historyData?.items.map(i => i.totalScore).filter((s): s is number => s !== null) ?? [];
                return scores.length > 0 ? `${Math.max(...scores)}점` : '—';
              })()}
            </span>
            <span className="iv-stat__label">최고 점수</span>
          </div>
          <div className="iv-stat">
            <span className="iv-stat__value">{historyData ? historyData.totalItems : '—'}회</span>
            <span className="iv-stat__label">총 연습</span>
          </div>
          <div className={`iv-stat${(docSubscribed || ivSubscribed) ? ' iv-stat--premium' : ''}`}>
            <span className="iv-stat__value">{subscribedItems.length > 0 ? `${subscribedItems.length}개` : '미구독'}</span>
            <span className="iv-stat__label">구독 중</span>
          </div>
        </div>
      </section>

      {/* ── 준비 상태 + 퀵스타트 ── */}
      <div className="iv-grid-2">

        {/* 내 준비 상태 */}
        <div className="iv-card">
          <h2 className="iv-card__title">
            <span className="iv-card__icon-wrap iv-card__icon-wrap--blue"><User size={16} /></span>
            내 준비 상태
          </h2>
          <ul className="iv-status-list">
            <li className="iv-status-item">
              <span className="iv-status-item__label">서류 AI 코칭</span>
              <span className={`iv-status-item__value iv-status-item__value--${docSubscribed ? 'premium' : 'free'}`}>
                {docSubscribed ? '구독 중' : '미구독'}
              </span>
            </li>
            <li className="iv-status-item">
              <span className="iv-status-item__label">AI 모의면접</span>
              <span className={`iv-status-item__value iv-status-item__value--${ivSubscribed ? 'premium' : 'free'}`}>
                {ivSubscribed ? '구독 중' : '미구독'}
              </span>
            </li>

            {/* ── 이번 달 서류 분석 사용량 ── */}
            <li className="iv-status-item iv-status-item--usage">
              <span className="iv-status-item__label">이번 달 서류 분석</span>
              <div className="iv-quota-wrap">
                <div className="iv-quota-bar">
                  <div
                    className={`iv-quota-bar__fill${docPct >= 90 ? ' iv-quota-bar__fill--warn' : ''}`}
                    style={{ width: `${docPct}%` }}
                  />
                </div>
                <span className={`iv-quota-count${docPct >= 90 ? ' iv-quota-count--warn' : ''}`}>
                  {docUsed} / {docLimit}회
                </span>
              </div>
            </li>

            {/* ── 이번 달 AI 면접 사용량 ── */}
            <li className="iv-status-item iv-status-item--usage">
              <span className="iv-status-item__label">이번 달 AI 면접</span>
              <div className="iv-quota-wrap">
                <div className="iv-quota-bar">
                  <div
                    className={`iv-quota-bar__fill${ivPct >= 90 ? ' iv-quota-bar__fill--warn' : ''}`}
                    style={{ width: `${ivPct}%` }}
                  />
                </div>
                <span className={`iv-quota-count${ivPct >= 90 ? ' iv-quota-count--warn' : ''}`}>
                  {ivUsed} / {ivLimit}회
                </span>
              </div>
            </li>
          </ul>
        </div>

        {/* 퀵 스타트 */}
        <div className="iv-card iv-card--dark">
          <h2 className="iv-card__title iv-card__title--light">
            <span className="iv-card__icon-wrap iv-card__icon-wrap--glow"><Zap size={16} /></span>
            퀵 스타트
            <span className="iv-card__subtitle iv-card__subtitle--light">면접 바로 시작하기</span>
          </h2>
          <div className="iv-qs-list">
            <button className="iv-mode-card iv-mode-card--text" onClick={() => navigate('/interview/text')}>
              <div className="iv-mode-card__deco" />
              <div className="iv-mode-card__icon"><MessageSquare size={22} /></div>
              <div className="iv-mode-card__body">
                <p className="iv-mode-card__label">AI 텍스트 · 음성 면접</p>
                <p className="iv-mode-card__desc">타이핑 또는 마이크로 답변, 채팅 스타일</p>
              </div>
              <span className="iv-mode-card__cta">시작하기 <ChevronRight size={14} /></span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 최근 히스토리 ── */}
      <div className="iv-card">
        <h2 className="iv-card__title">
          <span className="iv-card__icon-wrap iv-card__icon-wrap--green"><ClipboardList size={16} /></span>
          최근 연습 히스토리
          <span className="iv-card__subtitle">최신 3개</span>
          <Link to="/interview/sessions" className="iv-card__view-all">전체 보기 →</Link>
        </h2>
        {historyLoading ? (
          <div className="iv-history-loading"><Loader2 size={20} className="iv-history-loading__spinner" /> 불러오는 중…</div>
        ) : historyError ? (
          <div className="iv-history-empty">
            <p>이력을 불러오지 못했습니다.</p>
            <button className="iv-tip__cta" onClick={() => refetchHistory()}>다시 시도 →</button>
          </div>
        ) : !historyData?.items.length ? (
          <div className="iv-history-empty">
            <p>아직 면접 이력이 없어요.</p>
            <button className="iv-tip__cta" onClick={() => navigate('/interview/text')}>첫 면접 시작하기 →</button>
          </div>
        ) : (
          <div className="iv-table-wrap"><table className="iv-table">
            <thead>
              <tr>
                <th>날짜</th>
                <th>면접 종류</th>
                <th>타겟 기업</th>
                <th>점수</th>
                <th>리포트 보기</th>
              </tr>
            </thead>
            <tbody>
              {historyData.items.map(row => (
                <tr key={row.sessionId}>
                  <td className="iv-table__date">
                    {new Date(row.createdAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                  </td>
                  <td>
                    <span className={`iv-badge iv-badge--${row.sessionType.toLowerCase()}`}>
                      {SESSION_TYPE_LABEL[row.sessionType] ?? row.sessionType}
                    </span>
                  </td>
                  <td>{row.targetCompany ?? '—'}</td>
                  <td>
                    {row.totalScore !== null
                      ? <span className={`iv-score ${scoreClass(row.totalScore)}`}>{row.totalScore}점</span>
                      : <span className="iv-score iv-score--pending">집계 중</span>}
                  </td>
                  <td>
                    <button
                      className="iv-report-btn"
                      onClick={() => navigate(`/interview/report?sessionId=${row.sessionId}`)}
                    >
                      결과 보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>


    </div>
  );
}

export default InterviewHomePage;
