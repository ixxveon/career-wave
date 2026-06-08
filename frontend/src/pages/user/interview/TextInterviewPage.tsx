import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

import { interviewSessionApi }              from '../../../api/user/interview';
import { SESSION_TYPE }                     from '../../../types/user/interview';
import type { SessionType, Resume, MicStatus } from '../../../types/user/interview';

import { usePreflightCheck } from '../../../hooks/user/interview/usePreflightCheck';

import InterviewSetup from '../../../components/user/interview/InterviewSetup';
import InterviewRoom  from './InterviewRoom';

import { loadInterviewSession, clearInterviewSession } from '../../../utils/user/interview/sessionStorage';
import '@/styles/user/interview/TextInterviewPage.css';

const MOCK_SETUP = {
  resumeFileName: '이력서_최종본.pdf',
  resumeS3Url:    'https://s3.careerwave.kr/mock/resume.pdf',
};

export default function TextInterviewPage() {
  const [searchParams] = useSearchParams();
  const documentId     = searchParams.get('documentId');

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

  /* ── 비정상 종료 세션 복구 (constitution.md §상태 복원력) ── */
  useEffect(() => {
    const stored = loadInterviewSession();
    if (stored) {
      setSessionId(stored.sessionId);
      if (stored.sessionType) setSessionType(stored.sessionType as SessionType);
      if (stored.questionOrder > 1) setInitialQuestionOrder(stored.questionOrder);
      setPhase('interview');
    }
  }, []);

  /* ── 대표 이력서 로드 (추후 documentApi 연동 예정) ── */
  useEffect(() => {
    if (import.meta.env.DEV) {
      setResume({ fileName: MOCK_SETUP.resumeFileName, s3Url: MOCK_SETUP.resumeS3Url });
    }
    setResumeLoading(false);
  }, []);

  async function handleMicTest() {
    setMicStatus('testing');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicStatus('ok');
    } catch {
      setMicStatus('error');
    }
  }

  function handleAudioTest() {
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

  async function handleStart() {
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
      });
      setSessionId(result.sessionId);
      setPhase('interview');
    } catch (err) {
      if (import.meta.env.DEV) {
        setSessionId(`dev-session-${Date.now()}`);
        setPhase('interview');
      } else {
        const status = (err as { status?: number }).status;
        if (status === 403) {
          setApiError('연결된 서류에 접근 권한이 없습니다. 본인 소유의 서류인지 확인해주세요.');
        } else if (status === 404) {
          setApiError('연결된 서류를 찾을 수 없습니다. 서류 분석 페이지에서 다시 시도해주세요.');
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
