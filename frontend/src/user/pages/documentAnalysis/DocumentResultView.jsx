import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Mic, ThumbsUp, ThumbsDown, Wand2 } from 'lucide-react';
import './styles/DocumentResultView.css';

/* ── 헬퍼 ──────────────────────────────────────── */
function scoreColor(v) {
  return v >= 80 ? '#16a34a' : v >= 65 ? '#7c3aed' : '#dc2626';
}

/* ── 서브 컴포넌트 ──────────────────────────────── */
function TotalScoreRing({ score }) {
  const r = 52, cx = 68, cy = 68;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <svg viewBox="0 0 136 136" className="dr-ring__svg">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="14" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="14" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circ} ${circ}`}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="28" fontWeight="900" fill="#1e293b">{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fontWeight="600" fill="#64748b">/ 100점</text>
    </svg>
  );
}

function ScoreBar({ label, value, color }) {
  return (
    <div className="dr-bar-row">
      <span className="dr-bar-row__label">{label}</span>
      <div className="dr-bar-row__track">
        <div className="dr-bar-row__fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="dr-bar-row__val" style={{ color }}>{value}</span>
    </div>
  );
}

/* ── 메인 컴포넌트 ──────────────────────────────── */
/**
 * @param {{ result: object, onReset: () => void, label: string, subtitle?: string }} props
 *   result  — 백엔드 JSON ({ documentId, evaluation, feedbackDetails })
 *   onReset — 다시 작성하기 핸들러
 *   label   — eyebrow 텍스트 ('COVER LETTER AI' | 'RESUME ANALYSIS')
 *   subtitle — 배너 부제 (ex. '카카오 · 백엔드 개발자')
 */
export default function DocumentResultView({ result, onReset, label, subtitle }) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(0);

  const { evaluation, feedbackDetails } = result;
  const { totalScore, jobFitnessScore, techStackScore, quantifiedScore, logicalScore, overallReview } = evaluation;

  const subScores = [
    { label: '직무 적합도', value: jobFitnessScore, color: '#7c3aed' },
    { label: '기술 스택',   value: techStackScore,  color: '#2563eb' },
    { label: '경험 구체성', value: quantifiedScore, color: '#0891b2' },
    { label: '논리력/구조', value: logicalScore,     color: '#059669' },
  ];

  const gradeLabel = totalScore >= 80 ? '우수' : totalScore >= 65 ? '양호' : '개선 필요';
  const gradeColor = scoreColor(totalScore);
  const fd = feedbackDetails[activeSection];

  return (
    <div className="dr">

      {/* ── 배너 ── */}
      <div className="dr-banner">
        <div>
          <span className="dr-eyebrow">{label}</span>
          <h1 className="dr-banner__title">AI 종합 진단 리포트</h1>
          {subtitle
            ? <p className="dr-banner__sub">{subtitle} · {feedbackDetails.length}개 항목 분석 완료</p>
            : <p className="dr-banner__sub">{feedbackDetails.length}개 항목 분석 완료</p>
          }
        </div>
        <button className="dr-btn--outline" onClick={onReset}>다시 작성하기</button>
      </div>

      {/* ── 점수 요약 ── */}
      <div className="dr-summary">

        {/* 종합 점수 도넛 */}
        <div className="dr-card dr-summary__ring-wrap">
          <TotalScoreRing score={totalScore} />
          <p className="dr-summary__grade" style={{ color: gradeColor }}>{gradeLabel}</p>
          <p className="dr-summary__grade-label">종합 점수</p>
        </div>

        {/* 세부 게이지 바 */}
        <div className="dr-card dr-summary__bars">
          <p className="dr-card-title">세부 항목 점수</p>
          {subScores.map(s => <ScoreBar key={s.label} {...s} />)}
        </div>

        {/* AI 총평 */}
        <div className="dr-card dr-summary__review">
          <p className="dr-card-title"><Lightbulb size={14} /> AI 총평</p>
          <p className="dr-review__text">{overallReview}</p>
        </div>

      </div>

      {/* ── 항목 선택 탭 (2개 이상일 때만) ── */}
      {feedbackDetails.length > 1 && (
        <div className="dr-section-tabs">
          {feedbackDetails.map((item, i) => (
            <button
              key={i}
              className={`dr-section-tab${i === activeSection ? ' dr-section-tab--active' : ''}`}
              onClick={() => setActiveSection(i)}
            >
              <span className="dr-section-tab__num">{item.sectionNumber}</span>
              {item.question.length > 16 ? item.question.slice(0, 16) + '…' : item.question}
            </button>
          ))}
        </div>
      )}

      {/* ── 2분할 첨삭 뷰 ── */}
      <div className="dr-split">

        {/* 왼쪽: 원문 */}
        <div className="dr-card dr-split__original">
          <p className="dr-card-title">입력 원문</p>
          <p className="dr-split__question">{fd.question}</p>
          <p className="dr-split__text">{fd.originalText}</p>
        </div>

        {/* 오른쪽: 첨삭 카드 */}
        <div className="dr-split__feedback">

          <div className="dr-card dr-good-card">
            <p className="dr-good-card__label"><ThumbsUp size={13} /> 잘한 점</p>
            <p className="dr-good-card__text">{fd.goodPoint}</p>
          </div>

          <div className="dr-card dr-bad-card">
            <p className="dr-bad-card__label"><ThumbsDown size={13} /> 아쉬운 점</p>
            <p className="dr-bad-card__text">{fd.badPoint}</p>
          </div>

          <div className="dr-card dr-improved">
            <p className="dr-improved__label"><Wand2 size={13} /> 이렇게 고쳐보세요</p>
            <div className="dr-improved__before">
              <span className="dr-improved__badge dr-improved__badge--before">Before</span>
              <p>{fd.originalText}</p>
            </div>
            <div className="dr-improved__after">
              <span className="dr-improved__badge dr-improved__badge--after">After</span>
              <p>{fd.improvedText}</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── CTA ── */}
      <button className="dr-cta" onClick={() => navigate('/interview/text')}>
        <Mic size={20} />
        이 서류 기반으로 AI 실시간 음성 면접 시작하기
      </button>

    </div>
  );
}
