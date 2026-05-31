import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Mic, MicOff, Volume2,
  AlertCircle, Loader2, Wifi,
  Send, Clock, X, Keyboard,
} from 'lucide-react';
import { startSession } from '../../api/interview/startSession';
import type { Message, MicStatus, InputMode, Phase, Resume } from '../../types/interview';
import './TextInterviewPage.css';

/* ── Web Speech API 타입 선언 (TypeScript DOM lib 미포함 항목) ── */
declare global {
  interface Window {
    SpeechRecognition?:       new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    lang:            string;
    continuous:      boolean;
    interimResults:  boolean;
    start(): void;
    stop():  void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onend:    (() => void) | null;
    onerror:  ((event: Event) => void) | null;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
  }
}

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

const INIT_MESSAGES: Message[] = [{
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

function formatTime(s: number): string {
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

/* ── ChatRoom props ── */
interface ChatRoomProps {
  company: string;
  job: string;
  onExit: () => void;
}

/* ── 채팅 면접 룸 ───────────────────────────────── */
function ChatRoom({ company, job, onExit }: ChatRoomProps) {
  const navigate = useNavigate();

  /* ── State ── */
  const [messages,        setMessages]        = useState<Message[]>(INIT_MESSAGES);
  const [qNum,            setQNum]            = useState(1);
  const [elapsed,         setElapsed]         = useState(0);
  const [typing,          setTyping]          = useState(false);
  const [done,            setDone]            = useState(false);
  const [exitModal,       setExitModal]       = useState(false);
  /* 입력 모드 */
  const [inputMode,       setInputMode]       = useState<InputMode>('voice');
  const [input,           setInput]           = useState('');
  const [sttLive,         setSttLive]         = useState('');
  const [isRecording,     setIsRecording]     = useState(false);
  /* 답변 제한 카운트다운 */
  const [countdown,       setCountdown]       = useState(ANSWER_LIMIT);
  const [countdownActive, setCountdownActive] = useState(false);

  /* ── Refs ── */
  const bottomRef         = useRef<HTMLDivElement>(null);
  const elapsedRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const replyRef          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef    = useRef<SpeechRecognition | null>(null);
  const textareaRef       = useRef<HTMLTextAreaElement>(null);
  const audioRef          = useRef<HTMLAudioElement | null>(null);
  const pendingTextRef    = useRef('');
  const handleSendRef     = useRef<((text: string, opts?: SendOpts) => void) | null>(null);
  const qNumRef           = useRef(qNum);
  const sendOnMicStopRef  = useRef(false);
  const pendingVoiceIdRef = useRef<number | null>(null);

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
    return () => {
      if (elapsedRef.current !== null) clearInterval(elapsedRef.current);
    };
  }, []);

  useEffect(() => {
    if (done && elapsedRef.current !== null) clearInterval(elapsedRef.current);
  }, [done]);

  /* ── pendingTextRef 동기화 ── */
  useEffect(() => {
    pendingTextRef.current = inputMode === 'voice' ? sttLive : input;
  }, [input, sttLive, inputMode]);

  /* ─────────────────────────────────────────────────
     답변 카운트다운 타이머
  ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!countdownActive) return;
    if (countdown <= 0) {
      setCountdownActive(false);
      const pendingText = pendingTextRef.current.trim();

      if (pendingVoiceIdRef.current !== null) {
        const pid = pendingVoiceIdRef.current;
        pendingVoiceIdRef.current = null;
        setMessages(prev => prev.map(m =>
          m.id === pid ? { ...m, isPending: false, text: pendingText } : m
        ));
      } else if (pendingText) {
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: pendingText }]);
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, role: 'notice', text: '⏰ 답변 시간이 초과되었습니다.' }]);
      stopRecognition();
      handleSendRef.current?.('', { isTimeout: true });
      return;
    }
    countdownRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => {
      if (countdownRef.current !== null) clearTimeout(countdownRef.current);
    };
  }, [countdown, countdownActive]); // eslint-disable-line react-hooks/exhaustive-deps

  function startCountdown() {
    if (countdownRef.current !== null) clearTimeout(countdownRef.current);
    setCountdown(ANSWER_LIMIT);
    setCountdownActive(true);
  }
  function stopCountdown() {
    setCountdownActive(false);
    if (countdownRef.current !== null) clearTimeout(countdownRef.current);
  }

  /* ─────────────────────────────────────────────────
     TTS: SpeechSynthesis 브라우저 폴백
  ───────────────────────────────────────────────── */
  function playTTSFallback(text: string, onEnd: (() => void) | null) {
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
     AI 질문 말풍선 렌더링 + 오디오 재생
  ───────────────────────────────────────────────── */
  function displayAIQuestion(text: string, audioUrl: string | null) {
    setMessages(prev => [...prev, { id: Date.now(), role: 'ai', text }]);
    setTyping(false);
    audioRef.current?.pause();
    audioRef.current = null;

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
  ───────────────────────────────────────────────── */
  function stopRecognition() {
    sendOnMicStopRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    recognitionRef.current = null;
    setIsRecording(false);
  }

  function toggleMic() {
    if (isRecording) {
      stopCountdown();

      const pendingId = Date.now();
      pendingVoiceIdRef.current = pendingId;
      setMessages(prev => [...prev, {
        id: pendingId, role: 'user', isVoice: true, isPending: true, text: sttLive,
      }]);

      sendOnMicStopRef.current = true;
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
      setIsRecording(false);
      return;
    }

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { setInputMode('text'); startCountdown(); return; }

    const rec = new SR();
    rec.lang           = 'ko-KR';
    rec.continuous     = true;
    rec.interimResults = true;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const t = Array.from(e.results).map(r => (r as SpeechRecognitionResult)[0].transcript).join('');
      setSttLive(t);
      pendingTextRef.current = t;
    };

    rec.onend = () => {
      setIsRecording(false);
      if (sendOnMicStopRef.current) {
        sendOnMicStopRef.current = false;
        const finalText = pendingTextRef.current.trim();
        const pid = pendingVoiceIdRef.current;
        pendingVoiceIdRef.current = null;

        setMessages(prev => prev.map(m =>
          m.id === pid ? { ...m, isPending: false, text: finalText } : m
        ));

        setSttLive('');
        pendingTextRef.current = '';

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
    startCountdown();
  }

  /* ─────────────────────────────────────────────────
     공통 답변 전송 로직
  ───────────────────────────────────────────────── */
  interface SendOpts {
    isTimeout?: boolean;
    skipAddMessage?: boolean;
  }

  function handleSend(text: string, opts: SendOpts = {}) {
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

      const aiText = AI_REPLIES[Math.min(currentQ - 1, AI_REPLIES.length - 1)];
      setQNum(q => q + 1);
      displayAIQuestion(aiText, null);
    }, 1400);
  }

  /* handleSend 최신 참조 유지 */
  handleSendRef.current = handleSend;

  /* 마운트: 초기 AI 질문 TTS */
  useEffect(() => {
    playTTSFallback(INIT_MESSAGES[0].text, null);
    return () => {
      if (elapsedRef.current !== null) clearInterval(elapsedRef.current);
      if (countdownRef.current !== null) clearTimeout(countdownRef.current);
      if (replyRef.current !== null) clearTimeout(replyRef.current);
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
                onClick={() => { stopCountdown(); setInputMode('voice'); }}
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
  const [phase,         setPhase]         = useState<Phase>('setup');
  const [resume,        setResume]        = useState<Resume | null>(null);
  const [resumeLoading, setResumeLoading] = useState(true);
  const [job,           setJob]           = useState(JOB_OPTIONS[0]);
  const [company,       setCompany]       = useState('');
  const [micStatus,     setMicStatus]     = useState<MicStatus>('idle');
  const [audioPlaying,  setAudioPlaying]  = useState(false);
  const [isLoading,     setIsLoading]     = useState(false);
  const [apiError,      setApiError]      = useState<string | null>(null);

  /* 대표 이력서 로드 — 서류 도메인 연동 전 DEV 목업 사용 (Phase 5에서 documentApi 연동 예정) */
  useEffect(() => {
    if (import.meta.env.DEV) {
      setResume({ fileName: MOCK_SETUP.resumeFileName, s3Url: MOCK_SETUP.resumeS3Url });
    }
    setResumeLoading(false);
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
      const ctx = new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
    if (!company.trim() || resumeLoading || !resume) return;
    setApiError(null);
    setIsLoading(true);
    try {
      await startSession({ sessionType: 'VOICE', targetCompany: company });
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
          disabled={!company.trim() || isLoading || resumeLoading || !resume}
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
