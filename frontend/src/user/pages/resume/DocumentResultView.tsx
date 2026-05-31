import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb, Mic, ThumbsUp, ThumbsDown, Wand2, Star,
  CheckCircle2, XCircle, Hash, PenLine,
} from 'lucide-react';
import type { DocumentResult, FeedbackDetail } from '../../types/document';
import './DocumentResultView.css';

function scoreColor(v: number): string {
  return v >= 80 ? '#16a34a' : v >= 65 ? '#7c3aed' : '#dc2626';
}

interface TotalScoreRingProps {
  score: number;
}

function TotalScoreRing({ score }: TotalScoreRingProps) {
  const r = 52, cx = 68, cy = 68;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(score);
  const dash  = (score / 100) * circ;
  return (
    <svg viewBox="0 0 136 136" className="dr-ring__svg">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth="14" />
      <circle
        cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ}
        transform={`rotate(-90 ${cx} ${cy})`}
        className="dr-ring__arc"
        style={{ '--dr-ring-dash': dash, '--dr-ring-circ': circ } as React.CSSProperties}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="28" fontWeight="900" fill="#1e293b">{score}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fontWeight="600" fill="#64748b">/ 100점</text>
    </svg>
  );
}

interface ScoreBarProps {
  label: string;
  value: number;
  color: string;
}

function ScoreBar({ label, value, color }: ScoreBarProps) {
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

interface DocumentResultViewProps {
  result: DocumentResult;
  onReset: () => void;
  label: string;
  subtitle?: string;
  typeSelector?: React.ReactNode;
  onRevise?: (feedbackDetails: FeedbackDetail[]) => void;
  /** 면접 시작 시 사용할 documentId — 없으면 /interview/text 기본 이동 */
  interviewDocumentId?: string;
}

export default function DocumentResultView({
  result,
  onReset,
  label,
  subtitle,
  typeSelector,
  onRevise,
  interviewDocumentId,
}: DocumentResultViewProps) {
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
      <div className="dr-banner">
        <div>
          {typeSelector && <div className="dr-type-selector">{typeSelector}</div>}
          <span className="dr-eyebrow">{label}</span>
          <h1 className="dr-banner__title">AI 종합 진단 리포트</h1>
          {subtitle
            ? <p className="dr-banner__sub">{subtitle} · {feedbackDetails.length}개 항목 분석 완료</p>
            : <p className="dr-banner__sub">{feedbackDetails.length}개 항목 분석 완료</p>
          }
        </div>
        <div className="dr-banner__actions">
          {onRevise && (
            <button className="dr-btn--revise" onClick={() => onRevise(feedbackDetails)}>
              <PenLine size={14} /> 수정 후 재분석
            </button>
          )}
          <button className="dr-btn--outline" onClick={onReset}>다시 작성하기</button>
        </div>
      </div>

      <div className="dr-summary">
        <div className="dr-card dr-summary__ring-wrap">
          <TotalScoreRing score={totalScore} />
          <p className="dr-summary__grade" style={{ color: gradeColor }}>{gradeLabel}</p>
          <p className="dr-summary__grade-label">종합 점수</p>
        </div>
        <div className="dr-card dr-summary__bars">
          <p className="dr-card-title">세부 항목 점수</p>
          {subScores.map(s => <ScoreBar key={s.label} {...s} />)}
        </div>
        <div className="dr-card dr-summary__review">
          <p className="dr-card-title"><Lightbulb size={14} /> AI 총평</p>
          <p className="dr-review__text">{overallReview}</p>
        </div>
      </div>

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

      <div className="dr-split">
        <div className="dr-card dr-split__original">
          <p className="dr-card-title">입력 원문</p>
          <p className="dr-split__question">{fd.question}</p>
          <p className="dr-split__text">{fd.originalText}</p>
        </div>
        <div className="dr-split__feedback">
          <div className="dr-card dr-good-card">
            <p className="dr-good-card__label"><ThumbsUp size={13} /> 잘한 점</p>
            <p className="dr-good-card__text">{fd.goodPoint}</p>
          </div>
          <div className="dr-card dr-bad-card">
            <p className="dr-bad-card__label"><ThumbsDown size={13} /> 아쉬운 점</p>
            <p className="dr-bad-card__text">{fd.badPoint}</p>
          </div>
          {fd.starAnalysis && (
            <div className="dr-card dr-star-card">
              <p className="dr-star-card__label"><Star size={13} /> STAR 기법 분석</p>
              <div className="dr-star-grid">
                {(
                  [
                    { key: 's', name: 'S', ko: '상황' },
                    { key: 't', name: 'T', ko: '과제' },
                    { key: 'a', name: 'A', ko: '행동' },
                    { key: 'r', name: 'R', ko: '결과' },
                  ] as const
                ).map(({ key, name, ko }) => {
                  const item = fd.starAnalysis![key];
                  return (
                    <div key={key} className={`dr-star-row${item.ok ? ' dr-star-row--ok' : ' dr-star-row--bad'}`}>
                      <span className="dr-star-row__badge">{name}</span>
                      <span className="dr-star-row__ko">{ko}</span>
                      <p className="dr-star-row__comment">{item.comment}</p>
                      {item.ok
                        ? <CheckCircle2 size={14} className="dr-star-row__icon" />
                        : <XCircle size={14} className="dr-star-row__icon" />
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {fd.quantAnalysis && (
            <div className="dr-card dr-quant-card">
              <p className="dr-quant-card__label"><Hash size={13} /> 수치화·정량화 체크</p>
              <div className="dr-star-grid">
                {(
                  [
                    { key: 'numbers',   ko: '수치/퍼센트' },
                    { key: 'timeframe', ko: '기간/빈도'   },
                    { key: 'scale',     ko: '규모/범위'   },
                    { key: 'impact',    ko: '성과 임팩트' },
                  ] as const
                ).map(({ key, ko }) => {
                  const item = fd.quantAnalysis![key];
                  return (
                    <div key={key} className={`dr-star-row${item.ok ? ' dr-star-row--ok' : ' dr-star-row--bad'}`}>
                      <span className="dr-star-row__badge dr-star-row__badge--quant">#</span>
                      <span className="dr-star-row__ko">{ko}</span>
                      <p className="dr-star-row__comment">{item.comment}</p>
                      {item.ok
                        ? <CheckCircle2 size={14} className="dr-star-row__icon" />
                        : <XCircle size={14} className="dr-star-row__icon" />
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="dr-card dr-improved">
        <p className="dr-improved__label"><Wand2 size={13} /> 이렇게 고쳐보세요</p>
        <div className="dr-improved__panels">
          <div className="dr-improved__before">
            <span className="dr-improved__badge dr-improved__badge--before">Before</span>
            <p>{fd.originalText}</p>
          </div>
          <div className="dr-improved__after">
            <span className="dr-improved__badge dr-improved__badge--after">After</span>
            <p>{fd.improvedText}</p>
          </div>
        </div>
        {onRevise && (
          <button className="dr-revise-cta" onClick={() => onRevise(feedbackDetails)}>
            <PenLine size={14} /> 이 수정안 기반으로 재작성하기
          </button>
        )}
      </div>

      <button
        className="dr-cta"
        onClick={() => navigate(
          interviewDocumentId
            ? `/interview/text?documentId=${interviewDocumentId}`
            : '/interview/text'
        )}
      >
        <Mic size={20} />
        이 서류 기반으로 AI 텍스트 · 음성 면접 시작하기
      </button>
    </div>
  );
}
