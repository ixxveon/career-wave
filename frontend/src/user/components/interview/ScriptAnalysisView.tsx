import { memo, useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import type { FeedbackItem } from '../../types/interview';
import { getVoiceQualityLabel } from '../../utils/interview/voiceQuality';
import './ScriptAnalysisView.css';

interface ScriptAnalysisViewProps {
  feedbacks: FeedbackItem[];
}

/** 문항 점수 태그 — 85점 이상 '우수', 미만 '개선' */
function scoreTag(score: number | null): 'good' | 'improve' | 'none' {
  if (score === null) return 'none';
  return score >= 85 ? 'good' : 'improve';
}

/** 지표 행 — null 이면 마스킹 배지 */
function MetricRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="sav-metric-row">
      <span className="sav-metric-row__label">{label}</span>
      {value === null ? (
        <span className="sav-metric-row__null">데이터 부족</span>
      ) : (
        <span className="sav-metric-row__value">{value}점</span>
      )}
    </div>
  );
}

/**
 * 문항별 질문 + 답변 + AI 피드백 + 지표 분석 뷰 (plan.md §Phase 4)
 * memo 필수 — 리포트 리렌더링 방지
 */
const ScriptAnalysisView = memo(function ScriptAnalysisView({ feedbacks }: ScriptAnalysisViewProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  if (!feedbacks.length) {
    return <p className="sav-empty">분석된 답변이 없습니다.</p>;
  }

  return (
    <ol className="sav-list">
      {feedbacks.map((fb, i) => {
        const tag        = scoreTag(fb.relevanceScore);
        const isOpen     = openIdx === i;
        const voiceLabel = getVoiceQualityLabel(fb.voiceQualityRatio);

        return (
          <li key={fb.questionOrder} className={`sav-item${isOpen ? ' sav-item--open' : ''}`}>
            <button
              className="sav-item__header"
              onClick={() => setOpenIdx(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="sav-item__num">{fb.questionOrder}</span>
              <span className="sav-item__q">{fb.questionText}</span>
              {tag !== 'none' && (
                <span className={`sav-item__tag sav-item__tag--${tag}`}>
                  {tag === 'good'
                    ? <><CheckCircle2 size={11} /> 우수</>
                    : <><AlertCircle  size={11} /> 개선</>}
                </span>
              )}
              {fb.relevanceScore !== null && (
                <span className="sav-item__score">{fb.relevanceScore}점</span>
              )}
              {isOpen
                ? <ChevronUp   size={15} className="sav-item__chevron" />
                : <ChevronDown size={15} className="sav-item__chevron" />}
            </button>

            {isOpen && (
              <div className="sav-item__body">
                {/* 답변 */}
                <div className="sav-section">
                  <p className="sav-section__label">내 답변</p>
                  <p className="sav-section__text">{fb.answerText}</p>
                </div>

                <div className="sav-divider" />

                {/* AI 피드백 */}
                <div className="sav-section sav-section--feedback">
                  <p className="sav-section__label sav-section__label--ai">
                    <TrendingUp size={12} /> AI 피드백
                  </p>
                  <p className="sav-section__text">{fb.aiFeedback}</p>
                </div>

                <div className="sav-divider" />

                {/* 지표 */}
                <div className="sav-metrics">
                  <MetricRow label="답변 일치도"  value={fb.relevanceScore} />
                  <MetricRow label="기술적 깊이"  value={fb.depthScore} />
                  <MetricRow label="전달력"       value={fb.deliveryScore} />
                  <MetricRow label="유창성"       value={fb.fluencyScore} />

                  {fb.voiceQualityRatio !== null && (
                    <div className="sav-voice-quality">
                      <span>음성 품질</span>
                      <span className={`sav-voice-quality__badge sav-voice-quality__badge--${voiceLabel === '양호' ? 'good' : 'poor'}`}>
                        {voiceLabel} ({fb.voiceQualityRatio.toFixed(1)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
});

export default ScriptAnalysisView;
