import { memo, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  RotateCcw, Home, Award,
  MessageSquare, Calendar,
  Lock, Volume2, Gauge,
  TrendingUp, Loader2, AlertCircle, X,
} from 'lucide-react';

import { useInterviewReport } from '../../hooks/interview/useInterviewReport';
import { loadInterviewSession } from '../../utils/interview/sessionStorage';
import { computeHybridScores, filterFeedbackScores } from '../../utils/interview/voiceQuality';
import ReportChart         from '../../components/interview/ReportChart';
import ScriptAnalysisView  from '../../components/interview/ScriptAnalysisView';
import type { InterviewReportResponse, SessionType } from '../../types/interview';
import './InterviewReportPage.css';

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
const IMPROVEMENT_THRESHOLD = 85;

const IMPROVEMENT_POOL = [
  {
    metricKey: 'relevance' as const,
    title:     '꼬리 질문 대응력 강화',
    desc:      'AI 질문의 의도를 빠르게 파악하고 핵심만 간결하게 답하는 연습을 해보세요.',
    cta:       '질문 의도 파악 연습',
    to:        '/interview/text',
  },
  {
    metricKey: 'depth' as const,
    title:     '기술 면접 심화 연습',
    desc:      '프로젝트 경험을 CS 개념과 직접 연결하는 답변을 만들어보세요.',
    cta:       '기술 심화 질문 연습',
    to:        '/interview/text',
  },
  {
    metricKey: 'delivery' as const,
    title:     '발성·자신감 향상',
    desc:      '목소리 크기와 톤을 일정하게 유지하는 발성 연습으로 면접관에게 신뢰감을 높여보세요.',
    cta:       '음성 면접 다시 연습하기',
    to:        '/interview/text',
  },
  {
    metricKey: 'fluency' as const,
    title:     '지연어 제거 & 속도 교정',
    desc:      "'어...', '음...' 같은 지연어를 줄이고 적정 속도로 말하는 연습을 해보세요.",
    cta:       '음성 면접 다시 연습하기',
    to:        '/interview/text',
  },
];

const FALLBACK_IMPROVEMENTS = [
  {
    title: '압박·심층 질문 도전',
    desc:  '전반적으로 높은 수준을 유지하고 있습니다. 더 어려운 질문에 도전해 완성도를 높여보세요.',
    cta:   '다시 면접 연습하기',
    to:    '/interview/text',
  },
];

/* ── PDF 모달 ─────────────────────────────────────── */
const PdfModal = memo(function PdfModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="ir-pdf-overlay" onClick={onClose}>
      <div className="ir-pdf-modal" onClick={e => e.stopPropagation()}>
        <button className="ir-pdf-modal__close" onClick={onClose}><X size={18} /></button>
        <div className="ir-pdf-modal__icon">PDF</div>
        <div className="ir-pdf-modal__badge">v2 COMING SOON</div>
        <h3 className="ir-pdf-modal__title">PDF 리포트 다운로드</h3>
        <p className="ir-pdf-modal__desc">
          나만의 면접 답변을 소장할 수 있는<br />
          PDF 리포트 다운로드 기능은<br />
          <strong>v2에서 공개됩니다!</strong>
        </p>
        <button className="ir-pdf-modal__cta" onClick={onClose}>확인했어요</button>
      </div>
    </div>
  );
});

/* ── 메인 컴포넌트 ────────────────────────────────── */
function InterviewReportPage() {
  const navigate                        = useNavigate();
  const [searchParams]                  = useSearchParams();
  const [showPdfModal, setShowPdfModal] = useState(false);

  // sessionId: URL 파라미터 우선 → sessionStorage 복구 순서 (spec §비정상 종료)
  const sessionId = useMemo(() => {
    const fromUrl     = searchParams.get('sessionId');
    if (fromUrl) return fromUrl;
    const stored = loadInterviewSession();
    return stored?.sessionId ?? null;
  }, [searchParams]);

  const { data, isLoading, isError, refetch } = useInterviewReport(sessionId);

  /* ── 로딩 ── */
  if (isLoading) {
    return (
      <div className="ir-state">
        <Loader2 size={32} className="ir-state__spinner" />
        <p>리포트를 불러오는 중입니다…</p>
      </div>
    );
  }

  /* ── 에러 ── */
  if (isError || !data) {
    return (
      <div className="ir-state ir-state--error">
        <AlertCircle size={32} />
        <p>리포트를 불러올 수 없습니다.</p>
        {sessionId
          ? <button className="ir-btn ir-btn--white" onClick={() => refetch()}>다시 시도</button>
          : <button className="ir-btn ir-btn--white" onClick={() => navigate('/interview')}>면접 홈으로</button>}
      </div>
    );
  }

  return <ReportContent data={data} onPdfClick={() => setShowPdfModal(true)} onNavigate={navigate}>
    {showPdfModal && <PdfModal onClose={() => setShowPdfModal(false)} />}
  </ReportContent>;
}

/* ── 리포트 본문 (memo) ────────────────────────────── */
interface ReportContentProps {
  data:       InterviewReportResponse;
  onPdfClick: () => void;
  onNavigate: (path: string) => void;
  children?:  React.ReactNode;
}

const ReportContent = memo(function ReportContent({
  data, onPdfClick, onNavigate, children,
}: ReportContentProps) {
  const filteredFeedbacks = useMemo(() => filterFeedbackScores(data.feedbacks), [data.feedbacks]);
  const hybridScores      = useMemo(() => computeHybridScores(data.feedbacks),  [data.feedbacks]);
  const grade             = getGrade(data.totalScore);

  const improvements = useMemo(() => {
    const items = IMPROVEMENT_POOL.filter(def => {
      const score = hybridScores[def.metricKey];
      if (score === null) return false;
      return score < IMPROVEMENT_THRESHOLD;
    });
    return items.length > 0 ? items : FALLBACK_IMPROVEMENTS;
  }, [hybridScores]);

  const sessionTypeLabel: Record<SessionType, string> = {
    TEXT:  'AI 텍스트 면접',
    VOICE: 'AI 음성 면접',
    VIDEO: 'AI 영상 면접',
  };

  const AI_METRICS = [
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
  ];

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
              <MessageSquare size={11} /> {sessionTypeLabel[data.sessionType]}
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
            <button className="ir-btn ir-btn--white" onClick={() => onNavigate('/interview/text')}>
              <RotateCcw size={14} /> 다시 연습하기
            </button>
            <button className="ir-btn ir-btn--pdf-locked" onClick={onPdfClick}>
              <Lock size={13} /> PDF 리포트
              <span className="ir-btn__premium-badge">PREMIUM</span>
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
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - (data.totalScore ?? 0) / 100)}`}
              />
            </svg>
            <div className="ir-score-ring__inner">
              <span className="ir-score-ring__value">{data.totalScore ?? '—'}</span>
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
                      {isNull ? '—' : m.value}
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
              <button className="ir-improve-card__cta" onClick={() => onNavigate(item.to)}>
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
