import { Send, AlertCircle, WifiOff } from 'lucide-react';
import CoverLetterForm from '../../../components/user/resume/CoverLetterForm';
import LoadingModal from '../../../components/user/resume/LoadingModal';
import QuotaBar from '../../../components/user/resume/QuotaBar';
import QuotaExhaustedBanner from '../../../components/user/resume/QuotaExhaustedBanner';
import DocumentResultView from './DocumentResultView';
import { useCoverLetterForm } from '../../../hooks/user/resume/useCoverLetterForm';
import { useResumeQuota } from '../../../hooks/user/resume/useResumeQuota';
import '@/styles/user/resume/CoverLetterAnalysisPage.css';

export default function CoverLetterAnalysisPage() {
  const {
    company, job, items, uiState, apiError, networkError, canSubmit,
    analysisResult,
    setCompany, setJob, addItem, removeItem, updateItem,
    handleSubmit, reset, dismissNetworkError,
  } = useCoverLetterForm();

  const isSubmitting = uiState === 'SUBMITTING';
  const isAnalyzing  = uiState === 'ANALYZING';

  const { data: quota, isEntitlementNotFound } = useResumeQuota();
  const isExhausted = quota ? quota.usedCount >= quota.limitCount : false;

  if (isEntitlementNotFound) {
    return (
      <div className="cla">
        <div className="cla-form-wrap">
          <QuotaExhaustedBanner noEntitlement />
        </div>
      </div>
    );
  }

  if (uiState === 'SUCCESS' && analysisResult) {
    return (
      <DocumentResultView
        result={{
          documentId: analysisResult.documentId,
          evaluation: {
            totalScore:        analysisResult.scores?.total                 ?? 0,
            jobFitnessScore:   analysisResult.scores?.jobFitness            ?? 0,
            techStackScore:    analysisResult.scores?.techStack              ?? 0,
            quantifiedScore:   analysisResult.scores?.quantifiedAchievement ?? 0,
            logicalScore:      analysisResult.scores?.logicalStructure       ?? 0,
            overallReview:     analysisResult.overallReview ?? '',
          },
          feedbackDetails: analysisResult.feedbackDetails,
        }}
        fileType="COVER_LETTER"
        label="COVER LETTER AI"
        subtitle={`${company} · ${job}`}
        onReset={reset}
        interviewDocumentId={analysisResult.documentId}
        // TODO: useCoverLetterForm에 setItemsFromFeedback 구현 후 onRevise 연동
        // 구현 전까지 onRevise 미전달 → DocumentResultView에서 "수정 후 재분석" 버튼 미노출
      />
    );
  }

  return (
    <div className="cl">
      {isAnalyzing && <LoadingModal onCancel={reset} />}

      {networkError && (
        <div className="ra-toast" role="alert" aria-live="assertive">
          <WifiOff size={14} aria-hidden="true" />
          네트워크 연결이 끊겼습니다. 연결 상태를 확인해주세요.
          <button type="button" className="ra-toast__close" onClick={dismissNetworkError} aria-label="알림 닫기">✕</button>
        </div>
      )}

      <div className="cl-input-wrap">
        <QuotaBar />

        {isExhausted && <QuotaExhaustedBanner />}

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
