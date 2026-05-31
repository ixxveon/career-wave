import { Send, AlertCircle, WifiOff } from 'lucide-react';
import CoverLetterForm from '../../components/resume/CoverLetterForm';
import LoadingModal from '../../components/resume/LoadingModal';
import ReportChart from '../../components/resume/ReportChart';
import FeedbackList from '../../components/resume/FeedbackList';
import { useCoverLetterForm } from '../../hooks/resume/useCoverLetterForm';
import { PLAN_LIMITS, MOCK_QUOTA } from '../../utils/resume/quota';
import './CoverLetterAnalysisPage.css';
import './ResumeAnalysisPage.css'; /* ra-quota-bar + ra-toast + ra-report 공용 스타일 */

export default function CoverLetterAnalysisPage() {
  const {
    company, job, items, uiState, apiError, networkError, wsMessage, canSubmit,
    analysisResult,
    setCompany, setJob, addItem, removeItem, updateItem,
    handleSubmit, reset, dismissNetworkError,
  } = useCoverLetterForm();

  const isSubmitting = uiState === 'SUBMITTING';
  const isAnalyzing  = uiState === 'ANALYZING';

  const { membership, documentUsed } = MOCK_QUOTA;
  const docLimit    = PLAN_LIMITS[membership].document;
  const docLeft     = docLimit - documentUsed;
  const pct         = Math.min((documentUsed / docLimit) * 100, 100);
  const isExhausted = docLeft <= 0;

  if (uiState === 'SUCCESS' && analysisResult) {
    return (
      <div className="cl">
        <div className="ra-report">
          <div className="ra-report__header">
            <span className="ra-eyebrow">COVER LETTER AI</span>
            <h1 className="ra-report__title">분석 리포트</h1>
          </div>

          <ReportChart scores={analysisResult.scores ?? {
            jobFitness: 0, techStack: 0, quantifiedAchievement: 0, logicalStructure: 0, total: 0,
          }} />

          <FeedbackList feedback={analysisResult.feedback} />

          <div className="ra-report__actions">
            <button
              type="button"
              className="ra-btn ra-btn--outline"
              onClick={reset}
            >
              다시 분석하기
            </button>
            <a
              href={`/interview?documentId=${analysisResult.documentId}`}
              className="ra-btn ra-btn--primary"
            >
              이 서류로 면접 시작하기
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cl">
      {isAnalyzing && <LoadingModal wsMessage={wsMessage} onCancel={reset} />}

      {networkError && (
        <div className="ra-toast" role="alert" aria-live="assertive">
          <WifiOff size={14} aria-hidden="true" />
          네트워크 연결이 끊겼습니다. 연결 상태를 확인해주세요.
          <button type="button" className="ra-toast__close" onClick={dismissNetworkError} aria-label="알림 닫기">✕</button>
        </div>
      )}

      <div className="cl-input-wrap">
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
          <Send size={15} aria-hidden="true" />
          {isSubmitting ? '제출 중...' : 'AI 분석 시작하기'}
        </button>
      </div>
    </div>
  );
}
