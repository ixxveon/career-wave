import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown, ChevronUp, RotateCcw, Home,
  CheckCircle2, AlertCircle, TrendingUp,
  Video, MessageSquare, Calendar, Award,
  Download, Lock, Eye, Activity, Gauge, Smile,
} from 'lucide-react';
import './InterviewReportPage.css';

/* ── Mock Data ─────────────────────────────────── */
const REPORT = {
  company:    '토스',
  job:        '백엔드 개발자',
  date:       '2025-05-22',
  type:       'video',   // 'video' | 'text'
  totalScore:  88,
  grade:      'A',
  membership: 'FREE',    // 'FREE' | 'PREMIUM'
};

/* 비디오 전용 - FastAPI raw 분석 수치 */
const AI_METRICS = [
  { Icon: Eye,      label: '시선 안정도',   value: 82,     unit: '%',      color: '#60a5fa', desc: '면접관과의 시선 접촉이 양호합니다.' },
  { Icon: Activity, label: '자세 안정성',   value: 76,     unit: '%',      color: '#34d399', desc: '상체 흔들림이 다소 감지되었습니다.' },
  { Icon: Gauge,    label: '말하기 속도',   value: 138,    unit: 'WPM',    color: '#a78bfa', desc: '적정 속도(120~150 WPM) 범위 내입니다.' },
  { Icon: Smile,    label: '표정 감정',     value: '안정',  unit: '',       color: '#fb923c', desc: '긍정적이고 차분한 표정이 유지되었습니다.' },
];

const REVIEWS = [
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

const IMPROVEMENTS = [
  { title: 'STAR 기법 심화',    desc: '과제(T)와 결과(R)에 수치를 반드시 포함하는 연습을 해보세요.',    cta: '관련 질문 연습하기',    to: '/interview/text'  },
  { title: '강점 사례 구체화',   desc: '강점을 말할 때 측정 가능한 성과(%, 시간)로 뒷받침하세요.',      cta: '강점 질문 연습하기',    to: '/interview/text'  },
  { title: '자세 안정성 향상',   desc: '면접 중 상체 흔들림이 감지됩니다. 자세 교정 연습을 추천합니다.', cta: '비디오 면접 다시 연습', to: '/interview/media' },
];

/* ── Component ─────────────────────────────────── */
function InterviewReportPage() {
  const navigate  = useNavigate();
  const [openIdx, setOpenIdx] = useState(null);

  const isPremium = REPORT.membership === 'PREMIUM';
  const isVideo   = REPORT.type === 'video';

  return (
    <div className="ir">

      {/* ── 배너 ── */}
      <div className="ir-banner">
        <div className="ir-banner__deco ir-banner__deco--1" />
        <div className="ir-banner__deco ir-banner__deco--2" />

        <div className="ir-banner__left">
          <div className="ir-banner__meta">
            <span className="ir-banner__type-badge">
              {isVideo
                ? <><Video size={11} /> AI 비디오 면접</>
                : <><MessageSquare size={11} /> 텍스트 면접</>}
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
            <button
              className="ir-btn ir-btn--white"
              onClick={() => navigate(isVideo ? '/interview/media' : '/interview/text')}
            >
              <RotateCcw size={14} /> 다시 연습하기
            </button>

            {/* PDF 다운로드 - PREMIUM 전용 */}
            {isPremium ? (
              <button className="ir-btn ir-btn--pdf">
                <Download size={14} /> PDF 리포트 저장
              </button>
            ) : (
              <button className="ir-btn ir-btn--pdf-locked" disabled>
                <Lock size={13} /> PDF 리포트
                <span className="ir-btn__premium-badge">PREMIUM</span>
              </button>
            )}
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

      {/* ── AI 원시 분석 수치 (비디오 전용) ── */}
      {isVideo && (
        <div className="ir-card">
          <h2 className="ir-card__title">
            AI 실시간 분석 지표
            <span className="ir-card__badge">FastAPI 분석 결과</span>
          </h2>
          <div className="ir-metrics-grid">
            {AI_METRICS.map(({ Icon, label, value, unit, color, desc }) => (
              <div key={label} className="ir-metric-card" style={{ '--mc': color }}>
                <div className="ir-metric-card__icon"><Icon size={16} /></div>
                <div className="ir-metric-card__body">
                  <div className="ir-metric-card__value">
                    {value}
                    {unit && <span className="ir-metric-card__unit">{unit}</span>}
                  </div>
                  <div className="ir-metric-card__label">{label}</div>
                  {typeof value === 'number' && (
                    <div className="ir-metric-card__bar-track">
                      <div className="ir-metric-card__bar-fill" style={{ width: `${value}%` }} />
                    </div>
                  )}
                  <p className="ir-metric-card__desc">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  ? <ChevronUp size={15} className="ir-review-item__chevron" />
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
              <button className="ir-improve-card__cta" onClick={() => navigate(item.to)}>{item.cta} →</button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default InterviewReportPage;
