import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, RotateCcw, Home,
  CheckCircle2, AlertCircle, TrendingUp,
  MessageSquare, Calendar, Award,
  Lock, Volume2, Gauge, X,
} from 'lucide-react';
import type { Report, Metric, Review, ImprovementItem } from '../../types/interview';
import './styles/InterviewReportPage.css';

/* ── Mock Data ─────────────────────────────────── */
const REPORT: Report = {
  company:    '토스',
  job:        '백엔드 개발자',
  date:       '2025-05-22',
  type:       'text',
  totalScore:  88,
  grade:      'A',
  membership: 'FREE',
};

/* AI 면접 분석 지표
 * voiceOnly: true  → 음성 데이터 없으면 value null / -1 → 블러 처리
 * voiceOnly: false → 텍스트·음성 모두 채점, 항상 표시
 *
 * 채점 정책
 *   답변 일치도 / 기술적 깊이: 전체 문항 합산 ÷ 문항 수 (텍스트·음성 무관)
 *   전달력 및 발성 / 표현 유창성: 음성으로 답변한 문항만 합산 ÷ 음성 문항 수 */
const AI_METRICS: Metric[] = [
  {
    Icon:      MessageSquare,
    emoji:     '',
    label:     '답변 일치도',
    value:     82,
    unit:      '점',
    color:     '#60a5fa',
    desc:      'AI 질문의 의도를 정확히 파악하고 일관된 답변을 이어갔습니다.',
    voiceOnly: false,
  },
  {
    Icon:      TrendingUp,
    emoji:     '',
    label:     '기술적 깊이',
    value:     78,
    unit:      '점',
    color:     '#34d399',
    desc:      '실제 프로젝트 경험과 CS 지식을 구체적으로 연결한 답변이 돋보였습니다.',
    voiceOnly: false,
  },
  {
    Icon:      Volume2,
    emoji:     '',
    label:     '전달력 및 발성',
    value:     null,
    unit:      '점',
    color:     '#a78bfa',
    desc:      '목소리 성량(데시벨)과 톤·자신감을 종합 평가한 지표입니다.',
    voiceOnly: true,
  },
  {
    Icon:      Gauge,
    emoji:     '',
    label:     '표현 유창성',
    value:     null,
    unit:      '점',
    color:     '#fb923c',
    desc:      '말하기 속도(WPM)와 지연어(어, 음 등) 빈도를 분석한 지표입니다.',
    voiceOnly: true,
  },
];

const REVIEWS: Review[] = [
  {
    q:       '간단한 자기소개를 부탁드립니다.',
    a:       '안녕하세요. 저는 3년차 백엔드 개발자 김지원입니다. Spring Boot와 AWS 기반의 서비스 개발을 주로 담당해왔으며, 최근에는 결제 시스템 고도화 프로젝트에서 TPS 300을 안정적으로 처리하는 경험을 쌓았습니다.',
    feedback:'자기소개의 구조가 명확하고 수치 기반의 성과 언급이 인상적입니다. 다만 "저는"으로 시작하는 문장 반복이 다소 눈에 띕니다. 포지션과의 연결성을 첫 문장에 강조해보세요.',
    score:   90,
    tag:     'good',
  },
  {
    q:       '가장 어려웠던 프로젝트 경험을 말씀해주세요.',
    a:       '결제 시스템 레거시 마이그레이션이 가장 도전적이었습니다. 기존 모놀리식 코드를 무중단으로 전환해야 했고, 팀원들과 2주 스프린트 3번에 걸쳐 점진적 배포 전략을 수립해 성공적으로 마쳤습니다.',
    feedback:'STAR 기법을 잘 활용했습니다. 상황(S)과 과제(T)가 명확하나 본인의 구체적 역할(A)과 수치화된 결과(R)를 더 강조하면 완성도가 높아집니다.',
    score:   85,
    tag:     'good',
  },
  {
    q:       '본인의 강점과 약점은 무엇인가요?',
    a:       '강점은 문서화 습관입니다. 모든 API는 Swagger로 정리하고 팀 위키를 주도적으로 관리합니다. 약점은 발표 경험이 적어 대규모 청중 앞에서 긴장하는 편입니다. 이를 극복하기 위해 사내 스터디 발표를 자원하고 있습니다.',
    feedback:'약점을 솔직하게 인정하고 구체적인 개선 행동을 제시한 점이 좋습니다. 강점은 측정 가능한 성과(예: 온보딩 시간 X% 단축)를 추가하면 신뢰도가 높아집니다.',
    score:   82,
    tag:     'improve',
  },
  {
    q:       '팀 내 갈등 상황을 어떻게 해결하셨나요?',
    a:       '코드 리뷰 방향에 대한 의견 충돌이 있었습니다. 직접 1:1 미팅을 요청해 각자의 기준을 공유했고, 팀 공통 컨벤션 문서를 함께 작성해 이후 충돌을 사전에 방지했습니다.',
    feedback:'갈등의 원인과 해결 과정이 잘 설명되었습니다. 결과적으로 팀에 미친 긍정적 영향(예: 리뷰 시간 단축)을 수치로 언급하면 더욱 강력한 답변이 됩니다.',
    score:   88,
    tag:     'good',
  },
  {
    q:       '지원 동기가 무엇인가요?',
    a:       '토스의 기술 블로그를 꾸준히 읽으면서 대규모 트래픽을 다루는 방식에 깊이 공감했습니다. 특히 MSA 전환 과정의 트레이드오프를 솔직하게 공유하는 엔지니어링 문화가 제가 성장하기 좋은 환경이라 확신했습니다.',
    feedback:'회사 리서치가 잘 되어 있고 기술적 관점에서 지원 동기를 설명한 점이 돋보입니다. 본인 경험과 토스가 해결하려는 문제를 직접 연결하는 문장을 추가하면 완성도가 더 높아집니다.',
    score:   91,
    tag:     'good',
  },
];

/* ── 개선 추천 액션 — 지표 점수 기반 동적 생성 ─────────
 * 각 AI 지표가 THRESHOLD 미만이면 해당 개선 항목 추천
 * voiceOnly 지표는 value가 null이면 데이터 없음 → 스킵
 * 모든 지표가 양호하면 FALLBACK 항목 노출 */
const IMPROVEMENT_THRESHOLD = 85;

const IMPROVEMENT_POOL: ImprovementItem[] = [
  {
    metricLabel: '답변 일치도',
    title:       '꼬리 질문 대응력 강화',
    desc:        'AI 질문의 의도를 빠르게 파악하고 핵심만 간결하게 답하는 연습을 해보세요. 동문서답 없이 질문에 정확히 응답하는 훈련이 일치도 점수를 끌어올립니다.',
    cta:         '질문 의도 파악 연습',
    to:          '/interview/text',
  },
  {
    metricLabel: '기술적 깊이',
    title:       '기술 면접 심화 연습',
    desc:        '프로젝트 경험을 CS 개념과 직접 연결하는 답변을 만들어보세요. "왜 그 기술을 선택했는가"에 대한 근거와 트레이드오프까지 설명할 수 있으면 기술 깊이가 크게 올라갑니다.',
    cta:         '기술 심화 질문 연습',
    to:          '/interview/text',
  },
  {
    metricLabel: '전달력 및 발성',
    title:       '발성·자신감 향상',
    desc:        '목소리 크기와 톤을 일정하게 유지하는 발성 연습으로 면접관에게 신뢰감을 높여보세요. 답변 시작 첫 문장을 또렷하게 내뱉는 것만으로도 인상이 달라집니다.',
    cta:         '음성 면접 다시 연습하기',
    to:          '/interview/text',
  },
  {
    metricLabel: '표현 유창성',
    title:       '지연어 제거 & 속도 교정',
    desc:        "'어...', '음...' 같은 지연어를 의식적으로 줄이고, 적정 속도(120~150 WPM)로 말하는 연습을 꾸준히 해보세요. 유창성이 높아질수록 전문성 인상이 강해집니다.",
    cta:         '음성 면접 다시 연습하기',
    to:          '/interview/text',
  },
];

const FALLBACK_IMPROVEMENTS: ImprovementItem[] = [
  {
    title: '압박·심층 질문 도전',
    desc:  '전반적으로 높은 수준을 유지하고 있습니다. 더 어려운 압박 질문이나 예상치 못한 꼬리 질문에 도전해 완성도를 더 높여보세요.',
    cta:   '다시 면접 연습하기',
    to:    '/interview/text',
  },
  {
    title: '다른 직무로 연습',
    desc:  '현재 직무 외 다양한 포지션 면접을 경험하며 유연한 답변 능력을 키워보세요. 시야를 넓힐수록 본 직무 면접에서도 더 풍부한 답변이 가능합니다.',
    cta:   '새 면접 시작하기',
    to:    '/interview/text',
  },
];

function computeImprovements(metrics: Metric[]): ImprovementItem[] {
  const items = IMPROVEMENT_POOL.filter(def => {
    const metric = metrics.find(m => m.label === def.metricLabel);
    if (!metric) return false;
    if (metric.value === null || metric.value === -1) return false;
    return typeof metric.value === 'number' && metric.value < IMPROVEMENT_THRESHOLD;
  });
  return items.length > 0 ? items : FALLBACK_IMPROVEMENTS;
}

const IMPROVEMENTS = computeImprovements(AI_METRICS);

/* value가 null 또는 -1인 voiceOnly 지표 → blur 처리 */
function isNullMetric(m: Metric): boolean {
  return m.voiceOnly && (m.value === null || m.value === -1);
}

/* ── PDF v2 안내 모달 ─────────────────────────────── */
interface PdfModalProps {
  onClose: () => void;
}

function PdfModal({ onClose }: PdfModalProps) {
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
}

/* ── Component ─────────────────────────────────── */
function InterviewReportPage() {
  const navigate                              = useNavigate();
  const [openIdx, setOpenIdx]                 = useState<number | null>(null);
  const [showPdfModal, setShowPdfModal]       = useState(false);

  return (
    <div className="ir">
      {showPdfModal && <PdfModal onClose={() => setShowPdfModal(false)} />}

      {/* ── 배너 ── */}
      <div className="ir-banner">
        <div className="ir-banner__deco ir-banner__deco--1" />
        <div className="ir-banner__deco ir-banner__deco--2" />

        <div className="ir-banner__left">
          <div className="ir-banner__meta">
            <span className="ir-banner__type-badge">
              <MessageSquare size={11} /> AI 텍스트 · 음성 면접
            </span>
            <span className="ir-banner__date"><Calendar size={11} /> {REPORT.date}</span>
          </div>
          <h1 className="ir-banner__title">
            {REPORT.company} <span className="ir-banner__job">· {REPORT.job}</span>
          </h1>
          <p className="ir-banner__sub">AI가 분석한 면접 결과입니다. 피드백을 참고해 다음 면접을 준비해보세요.</p>

          <div className="ir-banner__actions">
            <button className="ir-btn ir-btn--outline" onClick={() => navigate('/interview')}>
              <Home size={14} /> 홈으로
            </button>
            <button className="ir-btn ir-btn--white" onClick={() => navigate('/interview/text')}>
              <RotateCcw size={14} /> 다시 연습하기
            </button>
            {/* PDF — v2 예정: disabled 스타일이지만 onClick으로 안내 모달 표시 */}
            <button className="ir-btn ir-btn--pdf-locked" onClick={() => setShowPdfModal(true)}>
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
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - REPORT.totalScore / 100)}`}
              />
            </svg>
            <div className="ir-score-ring__inner">
              <span className="ir-score-ring__value">{REPORT.totalScore}</span>
              <span className="ir-score-ring__label">/ 100</span>
            </div>
          </div>
          <div className="ir-grade">
            <Award size={14} />
            <span>등급</span>
            <strong>{REPORT.grade}</strong>
          </div>
        </div>
      </div>

      {/* ── AI 실시간 분석 지표 (전 면접 유형에 표시) ── */}
      <div className="ir-card">
        <h2 className="ir-card__title">
          AI 실시간 분석 지표
        </h2>
        <div className="ir-metrics-grid">
          {AI_METRICS.map((m) => {
            const nullState = isNullMetric(m);
            return (
              /* wrapper: 블러된 카드 위에 마스크 레이어를 absolute로 올리기 위한 relative 컨테이너 */
              <div key={m.label} className="ir-metric-card-wrap">

                {/* 블러 카드 본체 */}
                <div
                  className={`ir-metric-card${nullState ? ' ir-metric-card--null' : ''}`}
                  style={{ '--mc': m.color } as React.CSSProperties}
                >
                  <div
                    className="ir-metric-card__icon"
                    style={{ background: `${m.color}22`, color: m.color }}
                  >
                    <m.Icon size={16} />
                  </div>
                  <div className="ir-metric-card__body">
                    <div className="ir-metric-card__value">
                      {nullState ? '—' : m.value}
                      {!nullState && m.unit && (
                        <span className="ir-metric-card__unit">{m.unit}</span>
                      )}
                    </div>
                    <div className="ir-metric-card__label">{m.label}</div>
                    {!nullState && typeof m.value === 'number' && (
                      <div className="ir-metric-card__bar-track">
                        <div
                          className="ir-metric-card__bar-fill"
                          style={{
                            width: `${Math.min(m.value, 100)}%`,
                            background: m.color,
                          }}
                        />
                      </div>
                    )}
                    <p className="ir-metric-card__desc">{m.desc}</p>
                  </div>
                </div>

                {/* 마스크 오버레이 — 블러 카드의 형제 노드이므로 filter 영향 받지 않음 */}
                {nullState && (
                  <div className="ir-metric-card__mask">
                    <span>음성 면접 시에만<br />제공되는 지표입니다.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 질문별 리뷰 ── */}
      <div className="ir-card">
        <h2 className="ir-card__title">질문별 상세 리뷰</h2>
        <ol className="ir-review-list">
          {REVIEWS.map((r, i) => (
            <li key={i} className={`ir-review-item${openIdx === i ? ' ir-review-item--open' : ''}`}>
              <button
                className="ir-review-item__header"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
              >
                <span className="ir-review-item__num">{i + 1}</span>
                <span className="ir-review-item__q">{r.q}</span>
                <span className={`ir-review-item__tag ir-review-item__tag--${r.tag}`}>
                  {r.tag === 'good' ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                  {r.tag === 'good' ? '우수' : '개선'}
                </span>
                <span className="ir-review-item__score">{r.score}점</span>
                {openIdx === i
                  ? <ChevronUp   size={15} className="ir-review-item__chevron" />
                  : <ChevronDown size={15} className="ir-review-item__chevron" />}
              </button>

              {openIdx === i && (
                <div className="ir-review-item__body">
                  <div className="ir-review-item__section">
                    <p className="ir-review-item__section-label">내 답변</p>
                    <p className="ir-review-item__text">{r.a}</p>
                  </div>
                  <div className="ir-review-item__divider" />
                  <div className="ir-review-item__section ir-review-item__section--feedback">
                    <p className="ir-review-item__section-label ir-review-item__section-label--ai">
                      <TrendingUp size={12} /> AI 피드백
                    </p>
                    <p className="ir-review-item__text">{r.feedback}</p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>

      {/* ── 개선 추천 ── */}
      <div className="ir-card">
        <h2 className="ir-card__title">개선 추천 액션</h2>
        <div className="ir-improve-grid">
          {IMPROVEMENTS.map((item, i) => (
            <div key={i} className="ir-improve-card">
              <span className="ir-improve-card__num">{String(i + 1).padStart(2, '0')}</span>
              <p className="ir-improve-card__title">{item.title}</p>
              <p className="ir-improve-card__desc">{item.desc}</p>
              <button
                className="ir-improve-card__cta"
                onClick={() => navigate(item.to)}
              >
                {item.cta} →
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default InterviewReportPage;
