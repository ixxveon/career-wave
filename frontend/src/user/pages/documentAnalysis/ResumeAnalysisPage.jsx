import { useState, useRef } from 'react';
import {
  Upload, FileText, X, AlertCircle, Loader2,
} from 'lucide-react';
import { documentApi } from '../../api/documentApi';
import DocumentResultView from './DocumentResultView';
import './styles/ResumeAnalysisPage.css';

/* ── 상수 ──────────────────────────────────────── */
const ALLOWED_EXT = ['.pdf', '.doc', '.docx'];

/* ── 멤버십 한도 (InterviewHomePage와 동일 기준) ── */
const PLAN_LIMITS = { FREE: { document: 3 }, PREMIUM: { document: 20 } };

/* ── Mock 사용량 (백엔드 연동 전 임시) ─────────── */
const MOCK_QUOTA = { membership: 'PREMIUM', documentUsed: 7 };

const MOCK_RESULT = {
  documentId: 2,
  evaluation: {
    totalScore: 82,
    jobFitnessScore: 90,
    techStackScore: 80,
    quantifiedScore: 65,
    logicalScore: 85,
    overallReview:
      '전반적으로 백엔드 역량이 우수하나 성과의 정량적 수치화가 아쉽습니다. 기술 스택 언급과 팀 협업 경험은 긍정적으로 평가됩니다.',
  },
  feedbackDetails: [
    {
      sectionNumber: 1,
      question: '주요 프로젝트 경험',
      originalText: '결제 시스템 개발에 참여하였습니다. 팀원들과 협업하여 서비스를 개선했습니다.',
      goodPoint:
        '백엔드 프로젝트 경험과 팀 협업 이력이 명시되어 있어 기본 역량이 확인됩니다.',
      badPoint:
        '역할, 규모, 성과가 모두 빠져 있습니다. "참여", "개선"이라는 추상적 동사 대신 수치화된 임팩트를 작성해야 합니다.',
      improvedText:
        '월 거래액 50억 규모의 결제 시스템 API를 Spring Boot로 설계 및 구현, TPS 300 처리 안정화에 기여하였습니다. 5인 팀 스크럼 환경에서 백엔드 리드로 API 응답 속도를 평균 340ms → 80ms로 개선하였습니다.',
    },
    {
      sectionNumber: 2,
      question: '자기소개 및 강점',
      originalText: '다양한 경험을 통해 성장하였습니다.',
      goodPoint:
        '성장 의지가 드러나는 문장 구성입니다.',
      badPoint:
        '"다양한 경험"이라는 추상적 표현만으로는 역량을 판단할 수 없습니다. 구체적 경력 사실로 대체해야 합니다.',
      improvedText:
        '스타트업 3곳에서 백엔드 풀사이클 개발(기획→설계→배포)을 수행하며 서비스 런칭 5건의 경험을 쌓았습니다.',
    },
  ],
};

/* ── 서브 컴포넌트 ──────────────────────────────── */
function LoadingOverlay() {
  return (
    <div className="ra-overlay">
      <div className="ra-overlay__inner">
        <Loader2 className="ra-overlay__spinner" size={52} />
        <p className="ra-overlay__msg">AI 면접관이 서류의 문맥과 직무 적합도를 꼼꼼히 분석하고 있습니다.</p>
        <p className="ra-overlay__sub">잠시만 기다려주세요! (약 30초 소요)</p>
      </div>
    </div>
  );
}

/* ── 메인 컴포넌트 ──────────────────────────────── */
export default function ResumeAnalysisPage() {
  const [phase, setPhase]         = useState('upload'); // 'upload' | 'result'
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError]   = useState(null);
  const [dragging, setDragging]   = useState(false);
  const [file, setFile]           = useState(null);
  const [fileError, setFileError] = useState(null);
  const [job, setJob]             = useState('');
  const [result, setResult]       = useState(null);
  const inputRef                  = useRef(null);

  function validateAndSetFile(f) {
    if (!f) return;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      setFileError(`'${f.name}' 파일은 업로드할 수 없습니다. PDF, DOC, DOCX 형식만 허용됩니다.`);
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    validateAndSetFile(e.dataTransfer.files[0]);
  }

  async function handleSubmit() {
    setIsLoading(true);
    setApiError(null);
    try {
      // job → jobCategory
      const data = await documentApi.analyzeResume({ file, jobCategory: job });
      setResult(data);
      setPhase('result');
    } catch (err) {
      if (import.meta.env.DEV) {
        setResult(MOCK_RESULT);
        setPhase('result');
      } else {
        setApiError(err.message || '분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setPhase('upload');
    setFile(null);
    setResult(null);
    setApiError(null);
    setJob('');
    setFileError(null);
  }

  /* ── 결과 화면 ── */
  if (phase === 'result' && result) {
    return (
      <DocumentResultView
        result={result}
        onReset={handleReset}
        label="RESUME ANALYSIS"
        subtitle={`${file?.name ?? '이력서'} · ${job}`}
      />
    );
  }

  /* ── 업로드 화면 ── */
  const { membership, documentUsed } = MOCK_QUOTA;
  const docLimit  = PLAN_LIMITS[membership].document;
  const docLeft   = docLimit - documentUsed;
  const pct       = Math.min((documentUsed / docLimit) * 100, 100);
  const isExhausted = docLeft <= 0;

  return (
    <div className="ra">
      {isLoading && <LoadingOverlay />}

      <div className="ra-upload-wrap">
        {/* ── 할당량 표시 ── */}
        <div className="ra-quota-bar">
          <div className="ra-quota-bar__info">
            <span className="ra-quota-bar__label">이번 달 서류 분석</span>
            <span className={`ra-quota-bar__count${isExhausted ? ' ra-quota-bar__count--full' : docLeft <= 3 ? ' ra-quota-bar__count--warn' : ''}`}>
              {documentUsed} / {docLimit}회 사용
              {isExhausted && <span className="ra-quota-bar__tag">한도 초과</span>}
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

        {/* 드래그 앤 드롭 영역 */}
        <div
          className={`ra-dropzone${dragging ? ' ra-dropzone--over' : ''}${file ? ' ra-dropzone--filled' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={e => validateAndSetFile(e.target.files[0])}
          />

          {file ? (
            <div className="ra-file-card">
              <div className="ra-file-card__icon">
                <FileText size={28} />
              </div>
              <div className="ra-file-card__info">
                <p className="ra-file-card__name">{file.name}</p>
                <p className="ra-file-card__size">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                className="ra-file-card__remove"
                onClick={e => { e.stopPropagation(); setFile(null); setFileError(null); }}
              >
                <X size={14} /> 삭제
              </button>
            </div>
          ) : (
            <>
              <Upload size={32} className="ra-dropzone__icon" />
              <p className="ra-dropzone__label">파일을 드래그하거나 클릭해서 업로드</p>
              <p className="ra-dropzone__hint">PDF, DOC, DOCX · 최대 10MB</p>
            </>
          )}
        </div>

        {/* 확장자 오류 메시지 */}
        {fileError && (
          <p className="ra-file-error">
            <AlertCircle size={13} /> {fileError}
          </p>
        )}

        {/* 직무 입력 */}
        <div className="ra-field">
          <label className="ra-field__label">분석 기준 직무</label>
          <input
            className="ra-field__input"
            placeholder="ex) 백엔드 개발자, 프론트엔드 개발자"
            value={job}
            onChange={e => setJob(e.target.value)}
          />
        </div>

        {/* API 오류 메시지 */}
        {apiError && (
          <p className="ra-api-error">
            <AlertCircle size={13} /> {apiError}
          </p>
        )}

        <button
          className="ra-btn ra-btn--primary"
          disabled={!file || !job.trim() || isLoading}
          onClick={handleSubmit}
        >
          {isLoading ? <Loader2 size={15} className="ra-btn__spinner" /> : <Upload size={15} />}
          AI 분석 시작하기
        </button>
      </div>
    </div>
  );
}
