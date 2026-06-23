import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, X, Loader2 } from 'lucide-react';

import { SESSION_TYPE, SESSION_STATE } from '../../../types/user/interview';
import type { SessionType } from '../../../types/user/interview';
import { ANSWER_LIMIT_SEC, MAX_QUESTION_COUNT, SESSION_LIMIT_SEC } from '../../../constants/user/interview';

import { useInterviewSession }  from '../../../hooks/user/interview/useInterviewSession';
import { useInterviewTimer }    from '../../../hooks/user/interview/useInterviewTimer';
import { useAudioRecorder }     from '../../../hooks/user/interview/useAudioRecorder';
import { interviewSessionApi }  from '../../../api/user/interview';
import { clearInterviewSession } from '../../../utils/user/interview/sessionStorage';

import TTSPlayer       from '../../../components/user/interview/TTSPlayer';
import ChatWindow      from '../../../components/user/interview/ChatWindow';
import TextAnswerInput from '../../../components/user/interview/TextAnswerInput';
import InterviewTimer  from '../../../components/user/interview/InterviewTimer';
import VoiceRecorder   from '../../../components/user/interview/VoiceRecorder';

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export interface InterviewRoomProps {
  sessionId:             string;
  company:               string;
  job:                   string;
  sessionType:           SessionType;
  initialQuestionOrder?: number;
  onExit:                () => void;
}

export default function InterviewRoom({
  sessionId, company, job, sessionType, initialQuestionOrder, onExit,
}: InterviewRoomProps) {
  const navigate = useNavigate();
  const session  = useInterviewSession({ sessionId, sessionType, initialQuestionOrder });

  const [inputMode,  setInputMode]  = useState<'voice' | 'text'>(
    sessionType === SESSION_TYPE.TEXT ? 'text' : 'voice',
  );
  const [sttLive,   setSttLive]   = useState('');
  const [elapsed,   setElapsed]   = useState(0);
  const [exitModal, setExitModal] = useState(false);

  const [pendingVoiceId, _setPendingVoiceId] = useState<number | null>(null);
  const pendingVoiceIdRef = useRef<number | null>(null);
  function setPendingVoiceId(id: number | null) {
    pendingVoiceIdRef.current = id;
    _setPendingVoiceId(id);
  }

  /* ── DEV mock: 초기 AI 질문 + RUNNING 전환 ── */
  useEffect(() => {
    if (import.meta.env.VITE_USE_MOCK_DATA !== 'true') return;
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

  /* ── 총 경과 타이머 + 30분 안전망 강제 종료 ── */
  const sessionEndedRef = useRef(false);
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        if (next >= SESSION_LIMIT_SEC && !sessionEndedRef.current) {
          sessionEndedRef.current = true;
          interviewSessionApi.end(sessionId).catch(() => {});
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sessionId]);

  /* ── FINISHED → 리포트 페이지 이동 ── */
  useEffect(() => {
    if (session.sessionState !== SESSION_STATE.FINISHED) return;
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

  /* ── 뒤로가기·탭 이탈 시 세션 강제 종료 ── */
  const sessionStateRef = useRef(session.sessionState);
  useEffect(() => { sessionStateRef.current = session.sessionState; }, [session.sessionState]);
  useEffect(() => {
    return () => {
      if (sessionStateRef.current !== SESSION_STATE.FINISHED) {
        interviewSessionApi.end(sessionId).catch(() => {});
        clearInterviewSession();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── 문항별 카운트다운 타이머 ── */
  const timer = useInterviewTimer({
    duration: ANSWER_LIMIT_SEC,
    onExpire: () => {
      if (recorder.status === 'recording') recorder.stop();
      session.dispatch({ type: 'ADD_MESSAGE', message: {
        id: Date.now(), role: 'notice', text: '⏰ 답변 시간이 초과되었습니다.',
      }});
      session.sendTextAnswer('');
    },
  });

  /* ── MediaRecorder 기반 STT ── */
  const recorder = useAudioRecorder({
    sessionId,
    questionOrder: session.questionOrder,
    onStop: () => {
      if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
        const pid = pendingVoiceIdRef.current;
        if (pid !== null) {
          session.dispatch({ type: 'UPDATE_MESSAGE', id: pid, updates: { isPending: false, text: '(음성 답변 전송됨)' } });
          setPendingVoiceId(null);
        }
        setSttLive('');
        session.sendTextAnswer('');
      }
    },
    onChunkFailed: (_idx, isFinal) => {
      if (isFinal) {
        const pid = pendingVoiceIdRef.current;
        if (pid !== null) {
          session.dispatch({ type: 'REMOVE_MESSAGE', id: pid });
          setPendingVoiceId(null);
        }
        session.dispatch({ type: 'ADD_MESSAGE', message: { id: Date.now(), role: 'notice', text: '⚠️ 음성 전송에 실패했습니다. 텍스트로 답변해주세요.' } });
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
    setPendingVoiceId(session.pendingVoiceId); // null 포함 항상 동기화
  }, [session.sttLiveText, session.pendingVoiceId]);

  /* ── 이벤트 핸들러 ── */
  async function handleMicStart() {
    if (recorder.status === 'recording') return;
    timer.start();
    const pid = Date.now();
    setPendingVoiceId(pid);
    session.dispatch({ type: 'ADD_MESSAGE', message: { id: pid, role: 'user', isVoice: true, isPending: true, text: '' } });
    session.dispatch({ type: 'SET_PENDING_VOICE_ID', id: pid });
    await recorder.start();
  }

  function handleMicStop() {
    timer.stop();
    recorder.stop();
  }

  async function handleTextSubmit(text: string) {
    timer.stop();
    if (recorder.status === 'recording') recorder.cancel();
    await session.sendTextAnswer(text);
  }

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

  const isDone         = session.sessionState === SESSION_STATE.FINISHED;
  const isError        = session.sessionState === SESSION_STATE.ERROR;
  const isReconnecting = session.sessionState === SESSION_STATE.RECONNECTING;
  const totalQ         = MAX_QUESTION_COUNT;

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

      {/* 재연결 중 안내 배너 (constitution §지속적 연결성) */}
      {isReconnecting && (
        <div className="ti-reconnect-bar" role="alert">
          <Loader2 size={14} className="ti-spin" />
          <span>네트워크 연결이 끊겼습니다. 자동으로 재연결을 시도하고 있습니다...</span>
        </div>
      )}

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
            duration={ANSWER_LIMIT_SEC}
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
              onSwitchToVoice={() => { timer.stop(); setInputMode('voice'); }}
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
