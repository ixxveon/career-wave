import { Loader2, Upload, AlertCircle } from 'lucide-react';
import ResumeUpload from '../../components/resume/ResumeUpload';
import { useResumeUpload } from '../../hooks/resume/useResumeUpload';
import './ResumeAnalysisPage.css';

/* ── 멤버십 한도 (백엔드 연동 전 임시 목업) ── */
const PLAN_LIMITS = { FREE: { document: 1 }, PREMIUM: { document: 20 } };
const MOCK_QUOTA  = { membership: 'PREMIUM' as const, documentUsed: 7 };

/* ── 메인 컴포넌트 ──────────────────────────────── */
export default function ResumeAnalysisPage() {
  const {
    file,
    uiState,
    fileError,
    apiError,
    handleFileSelect,
    handleFileRemove,
    handleUpload,
    reset,
  } = useResumeUpload();

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
      <div className="ra">
        <div className="ra-upload-wrap" style={{ alignItems: 'center', textAlign: 'center', gap: 16 }}>
          <Loader2 size={48} className="ra-overlay__spinner" style={{ color: 'var(--color-primary)' }} />
          <p style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>AI가 이력서를 분석하고 있어요</p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>잠시만 기다려주세요 (약 30초 소요)</p>
          <button type="button" className="ra-btn ra-btn--outline" onClick={reset}>
            취소
          </button>
        </div>
      </div>
    );
  }

  /* ── 업로드 화면 ── */
  return (
    <div className="ra">
      <div className="ra-upload-wrap">

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

        <span className="ra-eyebrow">RESUME ANALYSIS</span>
        <h1 className="ra-upload__title">이력서 AI 분석</h1>
        <p className="ra-upload__desc">
          PDF 또는 Word 파일을 업로드하면 AI가 직무 적합도와<br />
          KPI 부족 문장을 찾아 개선 문장을 제안해드립니다.
        </p>

        {/* 파일 드롭존 */}
        <ResumeUpload
          file={file}
          error={fileError}
          disabled={isSubmitting || isExhausted}
          onFileSelect={handleFileSelect}
          onFileRemove={handleFileRemove}
        />

        {/* API 오류 메시지 */}
        {apiError && (
          <p className="ra-api-error" role="alert">
            <AlertCircle size={13} aria-hidden="true" /> {apiError}
          </p>
        )}

        <button
          type="button"
          className="ra-btn ra-btn--primary"
          disabled={!file || isSubmitting || isExhausted}
          onClick={handleUpload}
          aria-busy={isSubmitting}
        >
          {isSubmitting
            ? <><Loader2 size={15} className="ra-btn__spinner" aria-hidden="true" /> 업로드 중...</>
            : <><Upload size={15} aria-hidden="true" /> AI 분석 시작하기</>
          }
        </button>

      </div>
    </div>
  );
}
