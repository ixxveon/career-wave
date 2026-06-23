import { Upload, AlertCircle, WifiOff } from 'lucide-react';
import ResumeUpload from '../../../components/user/resume/ResumeUpload';
import LoadingModal from '../../../components/user/resume/LoadingModal';
import QuotaBar from '../../../components/user/resume/QuotaBar';
import DocumentResultView from './DocumentResultView';
import { useResumeUpload } from '../../../hooks/user/resume/useResumeUpload';
import { useResumeQuota } from '../../../hooks/user/resume/useResumeQuota';
import '@/styles/user/resume/ResumeAnalysisPage.css';

export default function ResumeAnalysisPage() {
  const {
    file, uiState, fileError, apiError, networkError,
    analysisResult,
    handleFileSelect, handleFileRemove, handleUpload, reset, dismissNetworkError,
  } = useResumeUpload();

  const isSubmitting = uiState === 'SUBMITTING';
  const isAnalyzing  = uiState === 'ANALYZING';

  const { data: quota } = useResumeQuota();
  const isExhausted = quota ? quota.usedCount >= quota.limitCount : false;

  if (uiState === 'SUCCESS' && analysisResult) {
    return (
      <DocumentResultView
        result={{
          documentId: analysisResult.documentId,
          evaluation: {
            totalScore:        analysisResult.scores?.total              ?? 0,
            jobFitnessScore:   analysisResult.scores?.jobFitness         ?? 0,
            techStackScore:    analysisResult.scores?.techStack           ?? 0,
            quantifiedScore:   analysisResult.scores?.quantifiedAchievement ?? 0,
            logicalScore:      analysisResult.scores?.logicalStructure    ?? 0,
            overallReview:     analysisResult.overallReview ?? '',
          },
          feedbackDetails: analysisResult.feedbackDetails,
        }}
        fileType="RESUME"
        label="RESUME ANALYSIS"
        subtitle={file?.name ?? '이력서'}
        onReset={reset}
        interviewDocumentId={analysisResult.documentId}
      />
    );
  }

  return (
    <div className="ra">
      {isAnalyzing && <LoadingModal onCancel={reset} />}

      {networkError && (
        <div className="ra-toast" role="alert" aria-live="assertive">
          <WifiOff size={14} aria-hidden="true" />
          네트워크 연결이 끊겼습니다. 연결 상태를 확인해주세요.
          <button type="button" className="ra-toast__close" onClick={dismissNetworkError} aria-label="알림 닫기">✕</button>
        </div>
      )}

      <div className="ra-upload-wrap">
        <QuotaBar />

        <span className="ra-eyebrow">RESUME ANALYSIS</span>
        <h1 className="ra-upload__title">이력서 AI 분석</h1>
        <p className="ra-upload__desc">
          PDF 또는 Word 파일을 업로드하면 AI가 직무 적합도와<br />
          KPI 부족 문장을 찾아 개선 문장을 제안해드립니다.
        </p>

        <ResumeUpload
          file={file}
          error={fileError}
          disabled={isSubmitting || isExhausted}
          onFileSelect={handleFileSelect}
          onFileRemove={handleFileRemove}
        />

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
          <Upload size={15} aria-hidden="true" />
          {isSubmitting ? '업로드 중...' : 'AI 분석 시작하기'}
        </button>
      </div>
    </div>
  );
}
