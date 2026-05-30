import { Loader2, Send, AlertCircle } from 'lucide-react';
import CoverLetterForm from '../../components/resume/CoverLetterForm';
import { useCoverLetterForm } from '../../hooks/resume/useCoverLetterForm';
import './CoverLetterAnalysisPage.css';
import './ResumeAnalysisPage.css'; /* ra-quota-bar 공용 스타일 */

/* ── 멤버십 한도 (백엔드 연동 전 임시 목업) ── */
const PLAN_LIMITS = { FREE: { document: 1 }, PREMIUM: { document: 20 } };
const MOCK_QUOTA  = { membership: 'PREMIUM' as const, documentUsed: 7 };

/* ── 메인 컴포넌트 ──────────────────────────────── */
export default function CoverLetterAnalysisPage() {
  const {
    company,
    job,
    items,
    uiState,
    apiError,
    canSubmit,
    setCompany,
    setJob,
    addItem,
    removeItem,
    updateItem,
    handleSubmit,
    reset,
  } = useCoverLetterForm();

  const isSubmitting = uiState === 'SUBMITTING';
  const isAnalyzing  = uiState === 'ANALYZING';

  /* ── 할당량 계산 ── */
  const { membership, documentUsed } = MOCK_QUOTA;
  const docLimit    = PLAN_LIMITS[membership].document;
  const docLeft     = docLimit - documentUsed;
  const pct         = Math.min((documentUsed / docLimit) * 100, 100);
  const isExhausted = docLeft <= 0;

  /* ── 분석 중 화면 (Phase 3에서 LoadingModal로 교체 예정) ── */
  if (isAnalyzing) {
    return (
      <div className="cl">
        <div className="cl-input-wrap" style={{ alignItems: 'center', textAlign: 'center', gap: 16 }}>
          <Loader2 size={48} className="ra-overlay__spinner" style={{ color: 'var(--color-primary)' }} />
          <p style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>AI가 자기소개서를 분석하고 있어요</p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>잠시만 기다려주세요 (약 30초 소요)</p>
          <button type="button" className="cl-btn cl-btn--outline" onClick={reset}>
            취소
          </button>
        </div>
      </div>
    );
  }

  /* ── 입력 화면 ── */
  return (
    <div className="cl">
      <div className="cl-input-wrap">

        {/* 할당량 표시 */}
        <div className="ra-quota-bar">
          <div className="ra-quota-bar__info">
            <span className="ra-quota-bar__label">이번 달 서류 분석</span>
            <span className={`ra-quota-bar__count${isExhausted ? ' ra-quota-bar__count--full' : docLeft <= 3 ? ' ra-quota-bar__count--warn' : ''}`}>
              {documentUsed} / {docLimit}회 사용
              {isExhausted  && <span className="ra-quota-bar__tag">한도 초과</span>}
              {!isExhausted && docLeft <= 3 && <span className="ra-quota-bar__tag ra-quota-bar__tag--warn">잔여 {docLeft}회</span>}
            </span>
          </div>
          <div className="ra-quota-bar__track">
            <div
              className={`ra-quota-bar__fill${isExhausted ? ' ra-quota-bar__fill--full' : pct >= 70 ? ' ra-quota-bar__fill--warn' : ''}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <span className="cl-eyebrow">COVER LETTER AI</span>
        <h1 className="cl-input__title">자기소개서 AI 분석</h1>
        <p className="cl-input__desc">
          문항과 답변을 입력하면 AI가 논리 구조, 표현 교정, 수정안을 제시합니다.<br />
          최대 5개 문항까지 한 번에 분석할 수 있습니다.
        </p>

        {/* 폼 컴포넌트 */}
        <CoverLetterForm
          company={company}
          job={job}
          items={items}
          disabled={isSubmitting || isExhausted}
          onCompanyChange={setCompany}
          onJobChange={setJob}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
        />

        {/* API 오류 메시지 */}
        {apiError && (
          <p className="cl-api-error" role="alert">
            <AlertCircle size={13} aria-hidden="true" /> {apiError}
          </p>
        )}

        <button
          type="button"
          className="cl-btn cl-btn--primary"
          disabled={!canSubmit || isSubmitting || isExhausted}
          onClick={handleSubmit}
          aria-busy={isSubmitting}
        >
          {isSubmitting
            ? <><Loader2 size={15} className="cl-btn__spinner" aria-hidden="true" /> 제출 중...</>
            : <><Send size={15} aria-hidden="true" /> AI 분석 시작하기</>
          }
        </button>

      </div>
    </div>
  );
}
