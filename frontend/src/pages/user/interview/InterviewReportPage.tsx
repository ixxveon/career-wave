import { memo, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  RotateCcw, Home, Award,
  MessageSquare, Calendar,
  Volume2, Gauge,
  TrendingUp, Loader2, AlertCircle,
} from 'lucide-react';

import { useInterviewReport } from '../../../hooks/user/interview/useInterviewReport';
import { IMPROVEMENT_THRESHOLD } from '../../../constants/user/interview';
import { loadInterviewSession } from '../../../utils/user/interview/sessionStorage';
import { computeHybridScores, filterFeedbackScores } from '../../../utils/user/interview/voiceQuality';
import ReportChart         from '../../../components/user/interview/ReportChart';
import ScriptAnalysisView  from '../../../components/user/interview/ScriptAnalysisView';
import type { InterviewReportResponse, SessionType } from '../../../types/user/interview';
import { SESSION_TYPE } from '../../../types/user/interview';
import '@/styles/user/interview/InterviewReportPage.css';

/* ── sessionType별 재연습 라우트 (as const 상수, constitution §금지패턴 문자열 하드코딩 방지) */
const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  TEXT:  'AI 텍스트 면접',
  VOICE: 'AI 음성 면접',
  VIDEO: 'AI 영상 면접',
};

const RETRY_ROUTE: Record<SessionType, string> = {
  [SESSION_TYPE.TEXT]:  '/interview/text',
  [SESSION_TYPE.VOICE]: '/interview/text',
  [SESSION_TYPE.VIDEO]: '/interview/text',
};

const FOCUS_TYPE_MAP: Record<string, string> = {
  relevance: 'FOLLOW_UP',
  depth:     'TECHNICAL_DEPTH',
  delivery:  'DELIVERY',
  fluency:   'FLUENCY',
};

/* ── 등급 산정 ────────────────────────────────────── */
function getGrade(score: number | null): string {
  if (score === null) return '—';
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

/* ── 개선 추천 (점수 기반 동적 생성) ─────────────── */

const IMPROVEMENT_POOL = [
  {
    metricKey: 'relevance' as const,
    title:     '꼬리 질문 대응력 강화',
    desc:      'AI 질문의 의도를 빠르게 파악하고 핵심만 간결하게 답하는 연습을 해보세요.',
    cta:       '질문 의도 파악 연습',
  },
  {
    metricKey: 'depth' as const,
    title:     '기술 면접 심화 연습',
    desc:      '프로젝트 경험을 CS 개념과 직접 연결하는 답변을 만들어보세요.',
    cta:       '기술 심화 질문 연습',
  },
  {
    metricKey: 'delivery' as const,
    title:     '발성·자신감 향상',
    desc:      '목소리 크기와 톤을 일정하게 유지하는 발성 연습으로 면접관에게 신뢰감을 높여보세요.',
    cta:       '음성 면접 다시 연습하기',
  },
  {
    metricKey: 'fluency' as const,
    title:     '지연어 제거 & 속도 교정',
    desc:      "'어...', '음...' 같은 지연어를 줄이고 적정 속도로 말하는 연습을 해보세요.",
    cta:       '음성 면접 다시 연습하기',
  },
];

const FALLBACK_IMPROVEMENTS = [
  {
    title: '압박·심층 질문 도전',
    desc:  '전반적으로 높은 수준을 유지하고 있습니다. 더 어려운 질문에 도전해 완성도를 높여보세요.',
    cta:   '다시 면접 연습하기',
  },
];

/* ── 메인 컴포넌트 ────────────────────────────────── */
function InterviewReportPage() {
  const navigate                        = useNavigate();
  const [searchParams]                  = useSearchParams();
  // sessionId: URL 파라미터 우선 → sessionStorage 복구 순서 (spec §비정상 종료)
  const sessionId = useMemo(() => {
    const fromUrl     = searchParams.get('sessionId');
    if (fromUrl) return fromUrl;
    const stored = loadInterviewSession();
    return stored?.sessionId ?? null;
  }, [searchParams]);

  const { data, isLoading, isError, isAnalyzing, refetch } = useInterviewReport(sessionId);

  /* ── sessionId 없음 — 이력 목록으로 안내 ── */
  if (!sessionId) {
    return (
      <div className="ir-state ir-state--error">
        <AlertCircle size={32} />
        <p>조회할 면접 세션이 없습니다.</p>
        <button className="ir-btn ir-btn--white" onClick={() => navigate('/interview/sessions')}>
          면접 이력에서 선택하기
        </button>
      </div>
    );
  }

  /* ── 로딩 ── */
  if (isLoading) {
    return (
      <div className="ir-state">
        <Loader2 size={32} className="ir-state__spinner" />
        <p>리포트를 불러오는 중입니다…</p>
      </div>
    );
  }

  /* ── 분석 중 (409 INTERVIEW_REPORT_NOT_READY — 재시도 소진) ── */
  if (isAnalyzing) {
    return (
      <div className="ir-state">
        <Loader2 size={32} className="ir-state__spinner" />
        <p>AI가 면접 결과를 분석하고 있습니다…</p>
        <p>분석이 완료되면 리포트가 자동으로 표시됩니다.</p>
        <button className="ir-btn ir-btn--white" onClick={() => refetch()}>수동 새로고침</button>
      </div>
    );
  }

  /* ── 에러 ── */
  if (isError || !data) {
    return (
      <div className="ir-state ir-state--error">
        <AlertCircle size={32} />
        <p>리포트를 불러올 수 없습니다.</p>
        <button className="ir-btn ir-btn--white" onClick={() => refetch()}>다시 시도</button>
      </div>
    );
  }

  return <ReportContent data={data} onNavigate={navigate} />;
}

/* ── 리포트 본문 (memo) ────────────────────────────── */
interface ReportContentProps {
  data:       InterviewReportResponse;
  onNavigate: (path: string) => void;
  children?:  React.ReactNode;
}

const ReportContent = memo(function ReportContent({
  data, onNavigate, children,
}: ReportContentProps) {
  const filteredFeedbacks = useMemo(() => filterFeedbackScores(data.feedbacks), [data.feedbacks]);
  const hybridScores      = useMemo(() => computeHybridScores(data.feedbacks),  [data.feedbacks]);
  // 서버 totalScore 우선, 없으면 클라이언트 가중치 평균으로 대체
  const displayScore      = data.totalScore ?? hybridScores.total;
  const grade             = getGrade(displayScore);
  const retryRoute        = RETRY_ROUTE[data.sessionType];

  const improvements = useMemo(() => {
    const items = IMPROVEMENT_POOL.filter(def => {
      const score = hybridScores[def.metricKey];
      if (score === null) return false;
      return score < IMPROVEMENT_THRESHOLD;
    });
    return items.length > 0 ? items : FALLBACK_IMPROVEMENTS;
  }, [hybridScores]);


  const AI_METRICS = useMemo(() => [
    {
      Icon:      MessageSquare,
      label:     '답변 일치도',
      value:     hybridScores.relevance,
      color:     '#60a5fa',
      desc:      'AI 질문의 의도를 정확히 파악하고 일관된 답변을 이어갔습니다.',
      voiceOnly: false,
    },
    {
      Icon:      TrendingUp,
      label:     '기술적 깊이',
      value:     hybridScores.depth,
      color:     '#34d399',
      desc:      '실제 프로젝트 경험과 CS 지식을 구체적으로 연결한 답변이 돋보였습니다.',
      voiceOnly: false,
    },
    {
      Icon:      Volume2,
      label:     '전달력 및 발성',
      value:     hybridScores.delivery,
      color:     '#a78bfa',
      desc:      '목소리 성량(데시벨)과 톤·자신감을 종합 평가한 지표입니다.',
      voiceOnly: true,
    },
    {
      Icon:      Gauge,
      label:     '표현 유창성',
      value:     hybridScores.fluency,
      color:     '#fb923c',
      desc:      '말하기 속도(WPM)와 지연어(어, 음 등) 빈도를 분석한 지표입니다.',
      voiceOnly: true,
    },
  ], [hybridScores]);

  return (
    <div className="ir">
      {children}

      {/* ── 배너 ── */}
      <div className="ir-banner">
        <div className="ir-banner__deco ir-banner__deco--1" />
        <div className="ir-banner__deco ir-banner__deco--2" />

        <div className="ir-banner__left">
          <div className="ir-banner__meta">
            <span className="ir-banner__type-badge">
              <MessageSquare size={11} /> {SESSION_TYPE_LABEL[data.sessionType]}
            </span>
            <span className="ir-banner__date">
              <Calendar size={11} /> {new Date(data.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <h1 className="ir-banner__title">면접 결과 리포트</h1>
          <p className="ir-banner__sub">AI가 분석한 면접 결과입니다. 피드백을 참고해 다음 면접을 준비해보세요.</p>

          <div className="ir-banner__actions">
            <button className="ir-btn ir-btn--outline" onClick={() => onNavigate('/interview')}>
              <Home size={14} /> 홈으로
            </button>
            <button className="ir-btn ir-btn--white" onClick={() => onNavigate(retryRoute)}>
              <RotateCcw size={14} /> 다시 연습하기
            </button>
          </div>
        </div>

        <div className="ir-banner__score-wrap">
          <div className="ir-score-ring">
            <svg viewBox="0 0 120 120" className="ir-score-ring__svg">
              <circle cx="60" cy="60" r="50" className="ir-score-ring__track" />
              <circle
                cx="60" cy="60" r="50"
                className="ir-score-ring__fill"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - (displayScore ?? 0) / 100)}`}
              />
            </svg>
            <div className="ir-score-ring__inner">
              <span className="ir-score-ring__value">{displayScore ?? '—'}</span>
              <span className="ir-score-ring__label">/ 100</span>
            </div>
          </div>
          <div className="ir-grade">
            <Award size={14} />
            <span>등급</span>
            <strong>{grade}</strong>
          </div>
        </div>
      </div>

      {/* ── 레이더 차트 ── */}
      <div className="ir-card">
        <h2 className="ir-card__title">AI 실시간 분석 지표</h2>
        <ReportChart scores={hybridScores} sessionType={data.sessionType} />
      </div>

      {/* ── 지표 카드 ── */}
      <div className="ir-card">
        <h2 className="ir-card__title">지표 상세</h2>
        <div className="ir-metrics-grid">
          {AI_METRICS.map(m => {
            const isNull = m.voiceOnly && m.value === null;
            return (
              <div key={m.label} className="ir-metric-card-wrap">
                <div
                  className={`ir-metric-card${isNull ? ' ir-metric-card--null' : ''}`}
                  style={{ '--mc': m.color } as React.CSSProperties}
                >
                  <div className="ir-metric-card__icon" style={{ background: `${m.color}22`, color: m.color }}>
                    <m.Icon size={16} />
                  </div>
                  <div className="ir-metric-card__body">
                    <div className="ir-metric-card__value">
                      {isNull || m.value === null ? '—' : m.value}
                      {!isNull && m.value !== null && <span className="ir-metric-card__unit">점</span>}
                    </div>
                    <div className="ir-metric-card__label">{m.label}</div>
                    {!isNull && typeof m.value === 'number' && (
                      <div className="ir-metric-card__bar-track">
                        <div
                          className="ir-metric-card__bar-fill"
                          style={{ width: `${Math.min(m.value, 100)}%`, background: m.color }}
                        />
                      </div>
                    )}
                    <p className="ir-metric-card__desc">{m.desc}</p>
                  </div>
                </div>
                {isNull && (
                  <div className="ir-metric-card__mask">
                    <span>음성 면접 시에만<br />제공되는 지표입니다.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 문항별 분석 ── */}
      {filteredFeedbacks.length > 0 && (
        <div className="ir-card">
          <h2 className="ir-card__title">질문별 상세 리뷰</h2>
          <ScriptAnalysisView feedbacks={filteredFeedbacks} />
        </div>
      )}

      {/* ── 개선 추천 ── */}
      <div className="ir-card">
        <h2 className="ir-card__title">개선 추천 액션</h2>
        <div className="ir-improve-grid">
          {improvements.map((item, i) => (
            <div key={i} className="ir-improve-card">
              <span className="ir-improve-card__num">{String(i + 1).padStart(2, '0')}</span>
              <p className="ir-improve-card__title">{item.title}</p>
              <p className="ir-improve-card__desc">{item.desc}</p>
              <button
                className="ir-improve-card__cta"
                onClick={() => {
                  const focusType = 'metricKey' in item ? FOCUS_TYPE_MAP[item.metricKey] : undefined;
                  const route = focusType ? `${retryRoute}?focusType=${focusType}` : retryRoute;
                  onNavigate(route);
                }}
              >
                {item.cta} →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default InterviewReportPage;
