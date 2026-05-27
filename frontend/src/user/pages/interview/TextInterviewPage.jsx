import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Mic, MicOff, Volume2,
  AlertCircle, Loader2, Wifi,
  Send, Clock, X, ArrowLeft, Keyboard,
} from 'lucide-react';
import { interviewApi } from '../../api/interviewApi';
import './styles/TextInterviewPage.css';

/* ── 상수 ──────────────────────────────────────── */
const JOB_OPTIONS = [
  '백엔드 개발자', '프론트엔드 개발자', '풀스택 개발자',
  '데이터 엔지니어', 'DevOps',
];

const MOCK_SETUP = {
  resumeFileName: '이력서_최종본.pdf',
  resumeS3Url: 'https://s3.careerwave.kr/mock/resume.pdf',
};

const TOTAL_Q = 5;
const ANSWER_LIMIT = 150; // 최대 답변 시간 2분 30초

const INIT_MESSAGES = [{
  id: 1,
  role: 'ai',
  text: '안녕하세요! AI 실시간 음성 면접을 시작하겠습니다.\n이력서를 분석했어요. 먼저 간단한 자기소개를 부탁드립니다.',
}];

// 목업 AI 답변 (WebSocket 연동 전)
const AI_REPLIES = [
  '답변 감사합니다. 말씀하신 내용을 바탕으로 추가 질문드릴게요.\n해당 기술적 선택의 근거는 무엇이었나요?',
  '좋습니다. 팀 협업 상황에서 의견 충돌이 생겼을 때 어떻게 해결하셨나요?',
  '인상적인 경험이네요. 본인의 강점과 약점을 각각 한 가지씩 말씀해 주세요.',
  '마지막 질문입니다. 입사 후 3년간의 커리어 목표를 말씀해 주세요.',
];

function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ── 로딩 오버레이 ──────────────────────────────── */
function LoadingOverlay() {
  return (
    <div className="ti-overlay">
      <div className="ti-overlay__box">
        <Loader2 className="ti-overlay__spinner" size={48} />
        <p className="ti-overlay__msg">AI 면접관이 준비 중입니다.</p>
        <p className="ti-overlay__sub">이력서와 직무 분석 중이에요. 잠시만 기다려 주세요!</p>
      </div>
    </div>
  );
}

/* ── 채팅 면접 룸 ───────────────────────────────── */
function ChatRoom({ company, job, onExit }) {
  const navigate = useNavigate();

  /* ── State ── */
  const [messages,        setMessages]        = useState(INIT_MESSAGES);
  const [qNum,            setQNum]            = useState(1);
  const [elapsed,         setElapsed]         = useState(0);
  const [typing,          setTyping]          = useState(false);
  const [done,            setDone]            = useState(false);
  const [exitModal,       setExitModal]       = useState(false);
  /* 입력 모드: 'voice' | 'text' */
  const [inputMode,       setInputMode]       = useState('voice');
  const [input,           setInput]           = useState('');     // 텍스트 모드
  const [sttLive,         setSttLive]         = useState('');     // 실시간 STT 미리보기
  const [isRecording,     setIsRecording]     = useState(false);
  /* 답변 제한 카운트다운 */
  const [countdown,       setCountdown]       = useState(ANSWER_LIMIT);
  const [countdownActive, setCountdownActive] = useState(false);

  /* ── Refs ── */
  const bottomRef      = useRef(null);
  const elapsedRef     = useRef(null);
  const countdownRef   = useRef(null);
  const replyRef       = useRef(null);
  const recognitionRef = useRef(null);
  const textareaRef    = useRef(null);
  const audioRef       = useRef(null);    // AI TTS 오디오
  const pendingTextRef    = useRef('');      // 자동 제출용 최신 입력 텍스트
  const handleSendRef     = useRef(null);    // stale closure 방지
  const qNumRef           = useRef(qNum);
  const sendOnMicStopRef  = useRef(false);   // 사용자가 직접 중지했는지 여부 (onend에서 전송 결정)
  const pendingVoiceIdRef = useRef(null);    // 전송 대기 중인 음성 버블 id
  useEffect(() => { qNumRef.current = qNum; }, [qNum]);

  /* ── body 스크롤 잠금 ── */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /* ── 스크롤 하단 고정 ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  /* ── 총 경과 타이머 ── */
  useEffect(() => {
    elapsedRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(elapsedRef.current);
  }, []);

  useEffect(() => { if (done) clearInterval(elapsedRef.current); }, [done]);

  /* ── pendingTextRef 동기화 (stale closure 방지) ── */
  useEffect(() => {
    pendingTextRef.current = inputMode === 'voice' ? sttLive : input;
  }, [input, sttLive, inputMode]);

  /* ─────────────────────────────────────────────────
     답변 카운트다운 타이머
     AI 음성 재생 종료 시 startCountdown() 호출로 활성화
  ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!countdownActive) return;
    if (countdown <= 0) {
      setCountdownActive(false);
      const pendingText = pendingTextRef.current.trim();

      // 진행 중이던 음성 버블 확정 처리
      if (pendingVoiceIdRef.current) {
        const pid = pendingVoiceIdRef.current;
        pendingVoiceIdRef.current = null;
        setMessages(prev => prev.map(m =>
          m.id === pid ? { ...m, isPending: false, text: pendingText } : m
        ));
      } else if (pendingText) {
        // 텍스트 모드에서 시간 초과 → 입력 중이던 텍스트를 사용자 버블로 남김
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: pendingText }]);
      }

      // 시간 초과 노티스
      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'notice', text: '⏰ 답변 시간이 초과되었습니다.' }]);
      stopRecognition();
      handleSendRef.current?.('', { isTimeout: true });
      return;
    }
    countdownRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(countdownRef.current);
  }, [countdown, countdownActive]);

  function startCountdown() {
    clearTimeout(countdownRef.current);
    setCountdown(ANSWER_LIMIT);
    setCountdownActive(true);
  }
  function stopCountdown() {
    setCountdownActive(false);
    clearTimeout(countdownRef.current);
  }

  /* ─────────────────────────────────────────────────
     TTS: AI 질문 음성 자동 재생 → 재생 종료 시 카운트다운 시작
     TODO [WebSocket]: new Audio(audioUrl).play() 로 대체
       (FastAPI TTS endpoint에서 받은 audioUrl 사용)
  ───────────────────────────────────────────────── */
  function playTTSFallback(text, onEnd) {
    if (!window.speechSynthesis) { setTimeout(() => onEnd?.(), 500); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text.replace(/\n/g, ' '));
    utt.lang   = 'ko-KR';
    utt.rate   = 1.05;
    utt.onend  = () => onEnd?.();
    utt.onerror = () => setTimeout(() => onEnd?.(), 500);
    window.speechSynthesis.speak(utt);
  }

  /* ─────────────────────────────────────────────────
     AI 질문 말풍선 렌더링 + 오디오 재생 + 카운트다운 시작
     TODO [WebSocket]: ws.onmessage → { type:'question', questionText, audioUrl }
  ───────────────────────────────────────────────── */
  function displayAIQuestion(text, audioUrl) {
    setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text }]);
    setTyping(false);
    audioRef.current?.pause();
    audioRef.current = null;

    /* TTS 재생만 — 카운트다운은 사용자가 마이크/키보드 버튼을 눌렀을 때 시작 */
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onerror = () => playTTSFallback(text, null);
      audio.play().catch(() => playTTSFallback(text, null));
    } else {
      playTTSFallback(text, null);
    }
  }

  /* ─────────────────────────────────────────────────
     STT: SpeechRecognition 브라우저 폴백
     TODO [WebSocket]: MediaRecorder → Blob → WS → Whisper(FastAPI) → 텍스트 수신
  ───────────────────────────────────────────────── */
  /* 시스템 강제 중지 (카운트다운 만료 / handleSend 내부)
     → sendOnMicStopRef를 false로 설정해 onend에서 자동 전송 안 함 */
  function stopRecognition() {
    sendOnMicStopRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    recognitionRef.current = null;
    setIsRecording(false);
  }

  function toggleMic() {
    if (isRecording) {
      /* ── 사용자 수동 중지 ──
         stop() 호출 후 onresult(최종) → onend 순으로 비동기 발생.
         sendOnMicStopRef = true 로 표시해 두면 onend에서 안전하게 전송. */
      stopCountdown(); // 녹음 멈추는 순간 타이머도 즉시 중지

      // 채팅창에 "음성 분석 중..." 버블 즉시 추가 → onend에서 텍스트로 교체
      const pendingId = Date.now();
      pendingVoiceIdRef.current = pendingId;
      setMessages(prev => [...prev, {
        id: pendingId, role: 'user', isVoice: true, isPending: true, text: sttLive,
      }]);

      sendOnMicStopRef.current = true;
      try { recognitionRef.current?.stop(); } catch {}
      recognitionRef.current = null;
      setIsRecording(false);
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setInputMode('text'); return; } // 미지원 브라우저 → 텍스트 모드로 전환

    const rec = new SR();
    rec.lang           = 'ko-KR';
    rec.continuous     = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      setSttLive(t);
      pendingTextRef.current = t;
    };

    /* onend: stop() 이후 마지막 onresult 까지 모두 처리된 뒤 발생
       → 사용자 수동 중지인 경우에만 pending 버블 확정 + AI 응답 트리거 */
    rec.onend = () => {
      setIsRecording(false);
      if (sendOnMicStopRef.current) {
        sendOnMicStopRef.current = false;
        const finalText = pendingTextRef.current.trim();
        const pid = pendingVoiceIdRef.current;
        pendingVoiceIdRef.current = null;

        // pending 버블을 최종 STT 텍스트로 교체
        setMessages(prev => prev.map(m =>
          m.id === pid ? { ...m, isPending: false, text: finalText } : m
        ));

        setSttLive('');
        pendingTextRef.current = '';

        // 텍스트가 있으면 AI 응답 트리거 (버블은 이미 추가됐으므로 skipAddMessage)
        if (finalText) {
          handleSendRef.current?.(finalText, { skipAddMessage: true });
        }
      }
    };

    rec.onerror = () => {
      sendOnMicStopRef.current = false;
      setIsRecording(false);
    };

    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
    startCountdown(); // 마이크 버튼을 누른 순간 답변 타이머 시작
  }

  /* ─────────────────────────────────────────────────
     공통 답변 전송 로직
     TODO [WebSocket]: ws.send(JSON.stringify({ type:'answer', text }))
  ───────────────────────────────────────────────── */
  function handleSend(text, opts = {}) {
    const { isTimeout = false, skipAddMessage = false } = opts;
    if (typing || done) return;
    if (!isTimeout && !skipAddMessage && !text?.trim()) return;
    stopCountdown();
    stopRecognition();
    window.speechSynthesis?.cancel();
    audioRef.current?.pause();

    if (!isTimeout && !skipAddMessage) {
      const trimmed = text.trim();
      setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: trimmed }]);
    }
    setInput('');
    setSttLive('');
    pendingTextRef.current = '';
    setTyping(true);

    replyRef.current = setTimeout(() => {
      const currentQ = qNumRef.current;

      /* 마지막 질문 → 면접 종료 */
      if (currentQ >= TOTAL_Q) {
        const closingText =
          '수고하셨습니다! 총 5개 질문에 모두 답변해 주셨어요.\n' +
          'AI가 답변을 분석하여 면접 리포트를 생성하고 있습니다. 잠시만 기다려 주세요.';
        setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text: closingText }]);
        setTyping(false);
        setDone(true);
        playTTSFallback(closingText, null);
        setTimeout(() => navigate('/interview/report'), 3000);
        return;
      }

      /* 다음 질문 */
      const aiText = AI_REPLIES[Math.min(currentQ - 1, AI_REPLIES.length - 1)];
      setQNum(q => q + 1);
      // TODO [WebSocket]: displayAIQuestion(data.questionText, data.audioUrl)
      displayAIQuestion(aiText, null);
    }, 1400);
  }

  /* handleSend 최신 참조 유지 (매 렌더) */
  handleSendRef.current = handleSend;

  /* 마운트: 초기 AI 질문 TTS (카운트다운은 사용자가 마이크/키보드 버튼을 눌렀을 때 시작) */
  useEffect(() => {
    // TODO [WebSocket]: 초기 질문도 { questionText, audioUrl } 형태로 수신
    playTTSFallback(INIT_MESSAGES[0].text, null);
    return () => {
      clearInterval(elapsedRef.current);
      clearTimeout(countdownRef.current);
      clearTimeout(replyRef.current);
      stopRecognition();
      window.speechSynthesis?.cancel();
      audioRef.current?.pause();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isUrgent = countdownActive && countdown <= 30;

  return (
    <div className="ti">

      {/* 면접 헤더 */}
      <header className="ti-header">
        <div className="ti-header__left">
          <span className="ti-header__company">{company || '기업명 미입력'}</span>
          <span className="ti-header__sep">·</span>
          <span className="ti-header__job">{job}</span>
        </div>
        <div className="ti-header__center">
          <div className="ti-header__dots">
            {Array.from({ length: TOTAL_Q }, (_, i) => (
              <span
                key={i}
                className={`ti-dot${
                  done || i < qNum - 1 ? ' ti-dot--done'
                  : i === qNum - 1     ? ' ti-dot--cur'
                  : ''
                }`}
              />
            ))}
          </div>
          <span className="ti-header__q">{done ? '완료' : `Q ${qNum} / ${TOTAL_Q}`}</span>
        </div>
        <div className="ti-header__right">
          <div className="ti-header__timer"><Clock size={13} /> {formatTime(elapsed)}</div>
          <button className="ti-header__exit" onClick={() => setExitModal(true)}>
            <X size={14} /> 종료
          </button>
        </div>
      </header>

      {/* 채팅 영역 */}
      <div className="ti-chat">
        {messages.map(msg => {
          /* 시스템 노티스 (시간 초과 등) */
          if (msg.role === 'notice') {
            return (
              <div key={msg.id} className="ti-msg ti-msg--notice">
                <span className="ti-notice-chip">{msg.text}</span>
              </div>
            );
          }
          return (
            <div key={msg.id} className={`ti-msg ti-msg--${msg.role}`}>
              {msg.role === 'ai' && <div className="ti-msg__avatar">AI</div>}
              <div className={`ti-msg__bubble${msg.isVoice ? ' ti-msg__bubble--voice' : ''}`}>
                {msg.isVoice ? (
                  <>
                    <span className="ti-voice-label">
                      {msg.isPending
                        ? <><Loader2 size={11} className="ti-spin" /> 음성 분석 중...</>
                        : <><Mic size={11} /> 음성 답변</>
                      }
                    </span>
                    {!msg.isPending && (
                      msg.text
                        ? <div className="ti-voice-text">{msg.text.split('\n').map((line, j) => <p key={j}>{line}</p>)}</div>
                        : <p className="ti-voice-empty">음성이 감지되지 않았습니다</p>
                    )}
                  </>
                ) : (
                  msg.text.split('\n').map((line, j) => <p key={j}>{line}</p>)
                )}
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="ti-msg ti-msg--ai">
            <div className="ti-msg__avatar">AI</div>
            <div className="ti-msg__bubble ti-msg__bubble--typing">
              <span /><span /><span />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── 하단 입력 영역 ── */}
      {done ? (
        <div className="ti-done-bar">
          <Loader2 size={16} className="ti-spin" />
          <span>AI가 리포트를 생성하고 있습니다. 잠시만 기다려 주세요...</span>
        </div>
      ) : (
        <div className={`ti-bottom${isUrgent ? ' ti-bottom--urgent' : ''}`}>

          {/* ① 답변 제한 카운트다운 바 */}
          {countdownActive && (
            <div className={`ti-countdown${isUrgent ? ' ti-countdown--urgent' : ''}`}>
              <div className="ti-countdown__track">
                <div
                  className="ti-countdown__fill"
                  style={{ width: `${(countdown / ANSWER_LIMIT) * 100}%` }}
                />
              </div>
              <span className={`ti-countdown__label${isUrgent ? ' ti-countdown__label--urgent' : ''}`}>
                <Clock size={11} />{isUrgent ? ' ⚠️' : ''} {formatTime(countdown)} 남음
              </span>
            </div>
          )}

          {/* ② 음성 입력 모드 (기본) */}
          {inputMode === 'voice' && (
            <div className="ti-voice-area">
              <button
                className={`ti-mic-main${isRecording ? ' ti-mic-main--on' : ''}`}
                onClick={toggleMic}
                type="button"
                aria-label={isRecording ? '녹음 중지 및 전송' : '음성 답변 시작'}
              >
                {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
                {isRecording && <span className="ti-mic-main__ring" aria-hidden="true" />}
              </button>

              <div className="ti-voice-hint-wrap">
                {isRecording ? (
                  <>
                    <span className="ti-voice-hint ti-voice-hint--on">
                      <span className="ti-rec-dot" />
                      녹음 중 · 버튼을 다시 누르면 전송됩니다
                    </span>
                    {sttLive && <p className="ti-stt-preview">{sttLive}</p>}
                  </>
                ) : (
                  <span className="ti-voice-hint">마이크 버튼을 눌러 음성으로 답변하세요</span>
                )}
              </div>

              <button
                className="ti-switch-input"
                onClick={() => { stopRecognition(); setSttLive(''); setInputMode('text'); startCountdown(); }}
                type="button"
              >
                <Keyboard size={13} /> 키보드로 답변하기
              </button>
            </div>
          )}

          {/* ③ 텍스트 입력 모드 (보조) */}
          {inputMode === 'text' && (
            <div className="ti-text-area">
              <div className="ti-input-bar">
                <textarea
                  ref={textareaRef}
                  className="ti-input"
                  placeholder="답변을 입력하세요 (Enter 전송 / Shift+Enter 줄바꿈)"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); }
                  }}
                  rows={3}
                  autoFocus
                />
                <button
                  className="ti-send"
                  onClick={() => handleSend(input)}
                  disabled={!input.trim() || typing}
                  type="button"
                >
                  <Send size={18} />
                </button>
              </div>
              <button
                className="ti-switch-input"
                onClick={() => setInputMode('voice')}
                type="button"
              >
                <Mic size={13} /> 음성으로 답변하기
              </button>
            </div>
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

/* ── 메인 컴포넌트 ──────────────────────────────── */
export default function TextInterviewPage() {
  const navigate = useNavigate();
  const [phase,         setPhase]         = useState('setup');
  const [resume,        setResume]        = useState(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [job,           setJob]           = useState(JOB_OPTIONS[0]);
  const [company,       setCompany]       = useState('');
  const [micStatus,     setMicStatus]     = useState('idle'); // 'idle'|'testing'|'ok'|'error'
  const [audioPlaying,  setAudioPlaying]  = useState(false);
  const [isLoading,     setIsLoading]     = useState(false);
  const [apiError,      setApiError]      = useState(null);

  /* 마운트 시 대표 이력서 조회 */
  useEffect(() => {
    interviewApi.getSetup()
      .then(data => setResume({ fileName: data.resumeFileName, s3Url: data.resumeS3Url }))
      .catch(() => {
        if (import.meta.env.DEV)
          setResume({ fileName: MOCK_SETUP.resumeFileName, s3Url: MOCK_SETUP.resumeS3Url });
      })
      .finally(() => setResumeLoading(false));
  }, []);

  /* 마이크 권한 체크 */
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

  /* 오디오 출력 테스트 (440Hz 비프음) */
  function handleAudioTest() {
    if (audioPlaying) return;
    setAudioPlaying(true);
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
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

  /* 면접 세션 시작 */
  async function handleStart() {
    if (!company.trim()) return;
    setApiError(null);
    setIsLoading(true);
    try {
      await interviewApi.startSession({
        targetJob: job,
        targetCompany: company,
        resumeS3Url: resume?.s3Url ?? '',
      });
      setPhase('chat');
    } catch {
      if (import.meta.env.DEV) setPhase('chat');
      else setApiError('세션 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  }

  /* ── 채팅 면접 룸 ── */
  if (phase === 'chat') {
    return (
      <ChatRoom
        company={company}
        job={job}
        onExit={() => { setPhase('setup'); setApiError(null); }}
      />
    );
  }

  /* ── 설정 화면 ── */
  return (
    <div className="ti-setup">
      {isLoading && <LoadingOverlay />}

      <div className="ti-setup__card">
        <button className="ti-setup__back" onClick={() => navigate('/interview')}>
          <ArrowLeft size={15} /> 면접 홈
        </button>
        <p className="ti-setup__eyebrow">AI INTERVIEW</p>
        <h1 className="ti-setup__title">AI 텍스트 · 음성 면접</h1>
        <p className="ti-setup__desc">
          타이핑으로 답변하거나 마이크 버튼으로 음성 답변 — 둘 다 가능해요.<br />
          이력서와 타겟 공고를 분석해 AI 면접관이 맞춤 질문을 드립니다.
        </p>

        {/* 대표 이력서 */}
        <div className={`ti-setup__resume${!resume && !resumeLoading ? ' ti-setup__resume--warn' : ''}`}>
          {resumeLoading
            ? <><Loader2 size={14} className="ti-spin" /> 대표 이력서 불러오는 중...</>
            : resume
            ? <><FileText size={14} /><span>{resume.fileName}</span><span className="ti-setup__resume-badge">연결됨</span></>
            : <><AlertCircle size={14} /><span className="ti-setup__resume-none">마이페이지에서 대표 이력서를 등록해주세요.</span></>
          }
        </div>

        {/* 목표 직무 */}
        <div className="ti-setup__section">
          <label className="ti-setup__label">목표 직무</label>
          <div className="ti-setup__chips">
            {JOB_OPTIONS.map(j => (
              <button key={j} className={`ti-chip${job === j ? ' ti-chip--on' : ''}`} onClick={() => setJob(j)}>
                {j}
              </button>
            ))}
          </div>
        </div>

        {/* 타겟 기업 */}
        <div className="ti-setup__section">
          <label className="ti-setup__label">타겟 기업</label>
          <input
            className="ti-setup__input"
            placeholder="ex) 토스, 카카오, 네이버"
            value={company}
            onChange={e => setCompany(e.target.value)}
          />
        </div>

        {/* 디바이스 환경 점검 */}
        <div className="ti-device-check">
          <p className="ti-device-check__title"><Wifi size={13} /> 디바이스 환경 점검</p>
          <div className="ti-device-check__grid">

            {/* 마이크 테스트 */}
            <div className="ti-device-item">
              <div className="ti-device-item__row">
                <button
                  className={`ti-device-btn${micStatus === 'ok' ? ' ti-device-btn--ok' : micStatus === 'error' ? ' ti-device-btn--err' : ''}`}
                  onClick={handleMicTest}
                  disabled={micStatus === 'testing'}
                >
                  {micStatus === 'testing' ? <Loader2 size={14} className="ti-spin" /> : <Mic size={14} />}
                  {micStatus === 'idle'    && '마이크 테스트'}
                  {micStatus === 'testing' && '확인 중...'}
                  {micStatus === 'ok'      && '마이크 연결됨'}
                  {micStatus === 'error'   && '권한 오류'}
                </button>
                {micStatus === 'ok' && (
                  <div className="ti-wave-bars">
                    {[0, 1, 2, 3, 4].map(i => (
                      <span key={i} className="ti-wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                )}
              </div>
              {micStatus === 'error' && (
                <p className="ti-device-item__hint">브라우저 설정에서 마이크 권한을 허용해주세요.</p>
              )}
            </div>

            {/* 스피커 테스트 */}
            <div className="ti-device-item">
              <button
                className={`ti-device-btn${audioPlaying ? ' ti-device-btn--playing' : ''}`}
                onClick={handleAudioTest}
                disabled={audioPlaying}
              >
                <Volume2 size={14} />
                {audioPlaying ? '재생 중...' : '스피커 테스트'}
              </button>
            </div>

          </div>
        </div>

        {apiError && (
          <p className="ti-api-error"><AlertCircle size={13} /> {apiError}</p>
        )}

        <button
          className="ti-setup__btn"
          onClick={handleStart}
          disabled={!company.trim() || isLoading}
        >
          {isLoading
            ? <><Loader2 size={15} className="ti-spin" /> 세션 생성 중...</>
            : <><Mic size={15} /> AI 텍스트 · 음성 면접 시작하기</>
          }
        </button>
      </div>
    </div>
  );
}
