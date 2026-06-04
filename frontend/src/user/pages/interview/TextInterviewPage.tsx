import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Clock, X, Loader2 } from 'lucide-react';

import { interviewSessionApi }   from '../../api/interview';
import { SESSION_TYPE }          from '../../types/interview';
import type { SessionType, Resume, MicStatus } from '../../types/interview';

import { usePreflightCheck }     from '../../hooks/interview/usePreflightCheck';
import { useInterviewSession }   from '../../hooks/interview/useInterviewSession';
import { useInterviewTimer }     from '../../hooks/interview/useInterviewTimer';
import { useAudioRecorder }      from '../../hooks/interview/useAudioRecorder';

import TTSPlayer       from '../../components/interview/TTSPlayer';
import ChatWindow      from '../../components/interview/ChatWindow';
import TextAnswerInput from '../../components/interview/TextAnswerInput';
import InterviewTimer  from '../../components/interview/InterviewTimer';
import VoiceRecorder   from '../../components/interview/VoiceRecorder';
import InterviewSetup  from '../../components/interview/InterviewSetup';

import { loadInterviewSession, clearInterviewSession } from '../../utils/interview/sessionStorage';
import './TextInterviewPage.css';

/* ── 상수 ── */
const ANSWER_LIMIT = 150; // 스펙 FR-004: 150초

const MOCK_SETUP = {
  resumeFileName: '이력서_최종본.pdf',
  resumeS3Url:    'https://s3.careerwave.kr/mock/resume.pdf',
};

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ─────────────────────────────────────────────────────────────
   면접 룸 컴포넌트
───────────────────────────────────────────────────────────── */
interface InterviewRoomProps {
  sessionId:            string;
  company:              string;
  job:                  string;
  sessionType:          SessionType;
  initialQuestionOrder?: number;
  onExit:               () => void;
}

function InterviewRoom({ sessionId, company, job, sessionType, initialQuestionOrder, onExit }: InterviewRoomProps) {
  const navigate = useNavigate();

  const session = useInterviewSession({ sessionId, sessionType, initialQuestionOrder });

  const [inputMode,  setInputMode]  = useState<'voice' | 'text'>(
    sessionType === SESSION_TYPE.TEXT ? 'text' : 'voice',
  );
  const [sttLive,    setSttLive]    = useState('');
  const [elapsed,    setElapsed]    = useState(0);
  const [exitModal,  setExitModal]  = useState(false);
  const [pendingVoiceId, _setPendingVoiceId] = useState<number | null>(null);
  const pendingVoiceIdRef = useRef<number | null>(null);
  function setPendingVoiceId(id: number | null) {
    pendingVoiceIdRef.current = id;
    _setPendingVoiceId(id);
  }

  /* ── DEV mock: 초기 AI 질문 + RUNNING 전환 ── */
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    session.dispatch({ type: 'RUNNING' });
    session.dispatch({
      type:    'ADD_MESSAGE',
      message: {
        id:   1,
        role: 'ai',
        text: '안녕하세요! AI 실시간 면접을 시작하겠습니다.\n이력서를 분석했어요. 먼저 간단한 자기소개를 부탁드립니다.',
      },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── 총 경과 타이머 ── */
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* ── FINISHED → 리포트 페이지 이동 ── */
  useEffect(() => {
    if (session.sessionState !== 'FINISHED') return;
    const timer = setTimeout(
      () => navigate(`/interview/report?sessionId=${sessionId}`),
      2000,
    );
    return () => clearTimeout(timer);
  }, [session.sessionState, sessionId, navigate]);

  /* ── body 스크롤 잠금 ── */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /* ── 문항별 카운트다운 타이머 ── */
  const timer = useInterviewTimer({
    duration: ANSWER_LIMIT,
    onExpire: () => {
      if (recorder.status === 'recording') recorder.stop();
      session.dispatch({ type: 'ADD_MESSAGE', message: {
        id: Date.now(), role: 'notice', text: '⏰ 답변 시간이 초과되었습니다.',
      }});
      session.sendTextAnswer(''); // 빈 답변으로 타임아웃 처리
    },
  });

  /* ── MediaRecorder 기반 STT ── */
  const recorder = useAudioRecorder({
    sessionId,
    questionOrder: session.questionOrder,
    onStop: () => {
      // 실제: FastAPI WS STT_RESULT 수신 시 pending 메시지 업데이트
      // DEV mock: ref로 최신 pendingVoiceId 참조 (stale closure 방지)
      if (import.meta.env.DEV) {
        const pid = pendingVoiceIdRef.current;
        if (pid !== null) {
          session.dispatch({
            type:    'UPDATE_MESSAGE',
            id:      pid,
            updates: { isPending: false, text: '(음성 답변 전송됨)' },
          });
          setPendingVoiceId(null);
        }
        setSttLive('');
        session.sendTextAnswer('');
      }
    },
    onChunkFailed: (_idx, isFinal) => {
      // 마지막 청크 전송 실패 — pending 말풍선 제거 후 텍스트 모드 전환
      if (isFinal) {
        const pid = pendingVoiceIdRef.current;
        if (pid !== null) {
          session.dispatch({ type: 'REMOVE_MESSAGE', id: pid });
          setPendingVoiceId(null);
        }
        session.dispatch({
          type:    'ADD_MESSAGE',
          message: { id: Date.now(), role: 'notice', text: '⚠️ 음성 전송에 실패했습니다. 텍스트로 답변해주세요.' },
        });
        setSttLive('');
        timer.stop();
        setInputMode('text');
        timer.start();
      }
    },
    onError: () => {
      const pid = pendingVoiceIdRef.current;
      if (pid !== null) {
        session.dispatch({ type: 'REMOVE_MESSAGE', id: pid });
        setPendingVoiceId(null);
      }
      timer.stop();
      setInputMode('text');
      timer.start();
    },
  });

  /* ── STT_RESULT WS 메시지로 sttLive 업데이트 ── */
  useEffect(() => {
    setSttLive(session.sttLiveText);
    if (session.pendingVoiceId !== null) {
      setPendingVoiceId(session.pendingVoiceId);
    }
  }, [session.sttLiveText, session.pendingVoiceId]);

  /* ── 마이크 시작 ── */
  async function handleMicStart() {
    if (recorder.status === 'recording') return;
    timer.start();
    const pid = Date.now();
    setPendingVoiceId(pid);
    session.dispatch({
      type:    'ADD_MESSAGE',
      message: { id: pid, role: 'user', isVoice: true, isPending: true, text: '' },
    });
    session.dispatch({ type: 'SET_PENDING_VOICE_ID', id: pid });
    await recorder.start();
  }

  /* ── 마이크 중지 (답변 제출) ── */
  function handleMicStop() {
    timer.stop();
    recorder.stop();
  }

  /* ── 텍스트 답변 전송 ── */
  async function handleTextSubmit(text: string) {
    timer.stop();
    if (recorder.status === 'recording') recorder.cancel();
    await session.sendTextAnswer(text);
  }

  /* ── 음성→텍스트 전환 (취소) ── */
  function handleSwitchToText() {
    if (recorder.status === 'recording') recorder.cancel();
    if (pendingVoiceId !== null) {
      session.dispatch({ type: 'REMOVE_MESSAGE', id: pendingVoiceId });
      setPendingVoiceId(null);
    }
    setSttLive('');
    timer.stop();
    setInputMode('text');
    timer.start();
  }

  const isDone   = session.sessionState === 'FINISHED';
  const isError  = session.sessionState === 'ERROR';
  const totalQ   = 5; // 서버 설정값으로 추후 대체 예정

  return (
    <div className="ti">
      {/* 헤더 */}
      <header className="ti-header">
        <div className="ti-header__left">
          <span className="ti-header__company">{company || '기업명 미입력'}</span>
          <span className="ti-header__sep">·</span>
          <span className="ti-header__job">{job}</span>
        </div>
        <div className="ti-header__center">
          <div className="ti-header__dots">
            {Array.from({ length: totalQ }, (_, i) => (
              <span key={i} className={`ti-dot${
                isDone || i < session.questionOrder - 1 ? ' ti-dot--done'
                : i === session.questionOrder - 1      ? ' ti-dot--cur'
                : ''
              }`} />
            ))}
          </div>
          <span className="ti-header__q">
            {isDone ? '완료' : `Q ${session.questionOrder} / ${totalQ}`}
          </span>
        </div>
        <div className="ti-header__right">
          <div className="ti-header__timer"><Clock size={13} /> {formatTime(elapsed)}</div>
          <button className="ti-header__exit" onClick={() => setExitModal(true)}>
            <X size={14} /> 종료
          </button>
        </div>
      </header>

      {/* TTS 상태 바 */}
      <div className="ti-tts-bar">
        <TTSPlayer status={session.ttsStatus} />
      </div>

      {/* 채팅창 */}
      <ChatWindow
        messages={session.messages}
        isTyping={session.isTyping}
        streamingText={session.streamingText}
      />

      {/* 하단 입력 영역 */}
      {isDone ? (
        <div className="ti-done-bar">
          <Loader2 size={16} className="ti-spin" />
          <span>AI가 리포트를 생성하고 있습니다. 잠시만 기다려 주세요...</span>
        </div>
      ) : isError ? (
        <div className="ti-error-bar">
          <span>세션 연결이 끊겼습니다.</span>
          <button onClick={onExit}>재시작</button>
        </div>
      ) : (
        <div className={`ti-bottom${timer.active && timer.remaining <= 30 ? ' ti-bottom--urgent' : ''}`}>
          <InterviewTimer
            remaining={timer.remaining}
            duration={ANSWER_LIMIT}
            active={timer.active}
          />
          {inputMode === 'voice' ? (
            <VoiceRecorder
              status={recorder.status}
              error={recorder.error}
              sttLive={sttLive}
              onStart={handleMicStart}
              onStop={handleMicStop}
              onSwitchToText={handleSwitchToText}
            />
          ) : (
            <TextAnswerInput
              disabled={session.isTyping}
              onSubmit={handleTextSubmit}
              onSwitchToVoice={() => {
                timer.stop();
                setInputMode('voice');
              }}
            />
          )}
        </div>
      )}

      {/* 종료 모달 */}
      {exitModal && (
        <div className="ti-overlay ti-overlay--modal" onClick={() => setExitModal(false)}>
          <div className="ti-exit-modal" onClick={e => e.stopPropagation()}>
            <h3>면접을 종료할까요?</h3>
            <p>지금까지의 답변은 저장되지 않습니다.</p>
            <div className="ti-exit-modal__btns">
              <button className="ti-exit-modal__cancel" onClick={() => setExitModal(false)}>계속하기</button>
              <button className="ti-exit-modal__confirm" onClick={onExit}>종료</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────────────────────────── */
export default function TextInterviewPage() {
  const [searchParams] = useSearchParams();
  const documentId    = searchParams.get('documentId');

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

  /* ── 대표 이력서 로드 (Phase 7에서 documentApi 연동 예정) ── */
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
    } catch {
      if (import.meta.env.DEV) {
        // DEV fallback: mock sessionId
        setSessionId(`dev-session-${Date.now()}`);
        setPhase('interview');
      } else {
        setApiError('세션 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
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
