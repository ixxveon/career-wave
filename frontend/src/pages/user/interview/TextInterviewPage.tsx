import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { interviewSessionApi }              from '../../../api/user/interview';
import { SESSION_TYPE }                     from '../../../types/user/interview';
import type { SessionType, Resume, MicStatus, FocusType, InProgressSessionResponse } from '../../../types/user/interview';

const VALID_FOCUS_TYPES: readonly FocusType[] = ['FOLLOW_UP', 'TECHNICAL_DEPTH', 'DELIVERY', 'FLUENCY'];
const parseFocusType = (value: string | null): FocusType | null =>
  VALID_FOCUS_TYPES.includes(value as FocusType) ? (value as FocusType) : null;
import type { MemberApiError }              from '../../../utils/user/member/errorMapping';

import { usePreflightCheck } from '../../../hooks/user/interview/usePreflightCheck';

import InterviewSetup from '../../../components/user/interview/InterviewSetup';
import InterviewRoom  from './InterviewRoom';

import { resumeHistoryApi } from '../../../api/user/resume';
import { loadInterviewSession, clearInterviewSession } from '../../../utils/user/interview/sessionStorage';
import '@/styles/user/interview/TextInterviewPage.css';

const MOCK_SETUP = {
  resumeFileName: '이력서_최종본.pdf',
  resumeS3Url:    'https://s3.careerwave.kr/mock/resume.pdf',
};

export default function TextInterviewPage() {
  const [searchParams] = useSearchParams();
  const documentId     = searchParams.get('documentId');
  const focusType      = parseFocusType(searchParams.get('focusType'));

  const preflight = usePreflightCheck();

  const [sessionId,            setSessionId]            = useState<string | null>(null);
  const [phase,                setPhase]                = useState<'setup' | 'interview'>('setup');
  const [resume,               setResume]               = useState<Resume | null>(null);
  const [resumeLoading,        setResumeLoading]        = useState(true);
  const [job,                  setJob]                  = useState('백엔드 개발자');
  const [company,              setCompany]              = useState('');
  const [sessionType,          setSessionType]          = useState<SessionType>(SESSION_TYPE.VOICE);
  const [initialQuestionOrder, setInitialQuestionOrder] = useState<number | undefined>(undefined);
  const [micStatus,     setMicStatus]     = useState<MicStatus>('idle');
  const [audioPlaying,  setAudioPlaying]  = useState(false);
  const [isLoading,     setIsLoading]     = useState(false);
  const [apiError,      setApiError]      = useState<string | null>(null);
  const [resumeModal,   setResumeModal]   = useState<InProgressSessionResponse | null>(null);

  /* ── 비정상 종료 세션 복구 — 서버 상태 확인 후 재개 모달 노출 (constitution.md §상태 복원력) ── */
  useEffect(() => {
    const stored = loadInterviewSession();
    if (!stored) return;

    interviewSessionApi.getInProgress()
      .then(session => {
        if (!session) {
          clearInterviewSession();
          return;
        }
        if (session.sessionId === stored.sessionId) {
          setResumeModal(session);
        } else {
          clearInterviewSession();
        }
      })
      .catch(() => {
        // 네트워크 오류·5xx → 서버 상태 불확실, 저장된 세션 유지
      });
  }, []);

  /* ── 이력서 정보 로드 ── */
  useEffect(() => {
    setResume(null);
    if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      setResume({ fileName: MOCK_SETUP.resumeFileName, s3Url: MOCK_SETUP.resumeS3Url });
      setResumeLoading(false);
      return;
    }
    if (!documentId) {
      setResumeLoading(false);
      return;
    }
    resumeHistoryApi.getByDocumentId(documentId)
      .then(item => {
        const fileName = item.originalName
          ?? (item.company && item.job ? `${item.company} · ${item.job}` : null)
          ?? item.company
          ?? '연결된 서류';
        setResume({ fileName, s3Url: '' });
      })
      .catch(() => { setResume(null); })
      .finally(() => setResumeLoading(false));
  }, [documentId]);

  async function handleMicTest(): Promise<void> {
    setMicStatus('testing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicStatus('ok');
    } catch {
      setMicStatus('error');
    }
  }

  function handleAudioTest(): void {
    if (audioPlaying) return;
    setAudioPlaying(true);
    try {
      const ctx = new (window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.0);
      osc.start();
      osc.stop(ctx.currentTime + 1.0);
      setTimeout(() => setAudioPlaying(false), 1100);
    } catch {
      setAudioPlaying(false);
    }
  }

  function handleResumeSession(): void {
    if (!resumeModal) return;
    const stored = loadInterviewSession();
    setSessionId(resumeModal.sessionId);
    setSessionType(resumeModal.sessionType);
    setCompany(resumeModal.targetCompany ?? '');
    if (stored?.questionOrder && stored.questionOrder > 1) {
      setInitialQuestionOrder(stored.questionOrder);
    }
    setResumeModal(null);
    setPhase('interview');
  }

  function handleNewSession(): void {
    clearInterviewSession();
    setResumeModal(null);
  }

  async function handleStart(): Promise<void> {
    if (!company.trim() || resumeLoading) return;
    // pre-flight gate (spec FR-001) — 모드별 조건 분리
    if (preflight.networkStatus === 'fail') return;
    if (sessionType === SESSION_TYPE.VOICE && preflight.micStatus === 'fail') return;
    setApiError(null);
    setIsLoading(true);
    try {
      const result = await interviewSessionApi.start({
        sessionType,
        targetCompany: company,
        documentId:    documentId ?? null,
        focusType:     focusType,
      });
      setSessionId(result.sessionId);
      setPhase('interview');
    } catch (err) {
      if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
        setSessionId(`dev-session-${Date.now()}`);
        setPhase('interview');
      } else {
        const e = err as MemberApiError;
        if (e.statusCode === 409 && e.serverCode === 'INTERVIEW_SESSION_DUPLICATE') {
          setApiError('이미 진행 중인 면접이 있습니다. 잠시 후 다시 시도하거나 페이지를 새로고침해주세요.');
        } else if (e.statusCode === 403) {
          setApiError('연결된 서류에 접근 권한이 없습니다. 본인 소유의 서류인지 확인해주세요.');
        } else if (e.statusCode === 404) {
          setApiError('연결된 서류를 찾을 수 없습니다. 이력서·자기소개서 분석 페이지에서 다시 시도해주세요.');
        } else {
          setApiError('세션 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (phase === 'interview' && sessionId) {
    return (
      <InterviewRoom
        sessionId={sessionId}
        company={company}
        job={job}
        sessionType={sessionType}
        initialQuestionOrder={initialQuestionOrder}
        onExit={() => {
          clearInterviewSession();
          setPhase('setup');
          setSessionId(null);
          setApiError(null);
        }}
      />
    );
  }

  if (resumeModal) {
    return (
      <div className="iv-resume-modal-overlay">
        <div className="iv-resume-modal">
          <h2 className="iv-resume-modal__title">이전 면접을 이어하시겠어요?</h2>
          <p className="iv-resume-modal__desc">
            중단된 면접 세션이 있습니다.
            {resumeModal.targetCompany && ` (${resumeModal.targetCompany})`}
            {' '}이어서 진행하거나 새로 시작할 수 있습니다.
          </p>
          <div className="iv-resume-modal__actions">
            <button className="iv-resume-modal__btn iv-resume-modal__btn--primary" onClick={handleResumeSession}>
              이어하기
            </button>
            <button className="iv-resume-modal__btn iv-resume-modal__btn--secondary" onClick={handleNewSession}>
              새로 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <InterviewSetup
      resume={resume}
      resumeLoading={resumeLoading}
      job={job}
      company={company}
      sessionType={sessionType}
      micCheckStatus={preflight.micStatus}
      networkCheckStatus={preflight.networkStatus}
      onCheckMic={preflight.checkMic}
      onCheckNetwork={preflight.checkNetwork}
      micStatus={micStatus}
      audioPlaying={audioPlaying}
      onMicTest={handleMicTest}
      onAudioTest={handleAudioTest}
      onJobChange={setJob}
      onCompanyChange={setCompany}
      onSessionTypeChange={setSessionType}
      onStart={handleStart}
      isLoading={isLoading}
      apiError={apiError}
    />
  );
}
