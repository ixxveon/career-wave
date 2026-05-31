import { Upload, AlertCircle, WifiOff } from 'lucide-react';
import ResumeUpload from '../../components/resume/ResumeUpload';
import LoadingModal from '../../components/resume/LoadingModal';
import ReportChart from '../../components/resume/ReportChart';
import FeedbackList from '../../components/resume/FeedbackList';
import { useResumeUpload } from '../../hooks/resume/useResumeUpload';
import { PLAN_LIMITS, MOCK_QUOTA } from '../../utils/resume/quota';
import './ResumeAnalysisPage.css';

export default function ResumeAnalysisPage() {
  const {
    file, uiState, fileError, apiError, networkError, wsMessage,
    analysisResult,
    handleFileSelect, handleFileRemove, handleUpload, reset, dismissNetworkError,
  } = useResumeUpload();

  const isSubmitting = uiState === 'SUBMITTING';
  const isAnalyzing  = uiState === 'ANALYZING';

  const { membership, documentUsed } = MOCK_QUOTA;
  const docLimit    = PLAN_LIMITS[membership].document;
  const docLeft     = docLimit - documentUsed;
  const pct         = Math.min((documentUsed / docLimit) * 100, 100);
  const isExhausted = docLeft <= 0;

  if (uiState === 'SUCCESS' && analysisResult) {
    return (
      <div className="ra">
        <div className="ra-report">
          <div className="ra-report__header">
            <span className="ra-eyebrow">RESUME ANALYSIS</span>
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
    <div className="ra">
      {isAnalyzing && <LoadingModal wsMessage={wsMessage} onCancel={reset} />}

      {networkError && (
        <div className="ra-toast" role="alert" aria-live="assertive">
          <WifiOff size={14} aria-hidden="true" />
          네트워크 연결이 끊겼습니다. 연결 상태를 확인해주세요.
          <button type="button" className="ra-toast__close" onClick={dismissNetworkError} aria-label="알림 닫기">✕</button>
        </div>
      )}

      <div className="ra-upload-wrap">
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
