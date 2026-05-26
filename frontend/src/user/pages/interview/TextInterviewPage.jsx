import { useState, useRef, useEffect } from 'react';
import { Send, X, Clock, FileText, ChevronRight } from 'lucide-react';
import './styles/TextInterviewPage.css';

const JOB_OPTIONS = ['백엔드 개발자', '프론트엔드 개발자', '풀스택 개발자', '데이터 엔지니어', 'DevOps'];

const INIT_MESSAGES = [
  {
    role: 'ai',
    text: '안녕하세요! 오늘 백엔드 개발자 포지션으로 면접을 시작하겠습니다.\n이력서와 타겟 공고를 분석했어요. 먼저 간단한 자기소개를 부탁드립니다.',
  },
];

function TextInterviewPage() {
  const [phase, setPhase] = useState('setup');
  const [job, setJob]       = useState('백엔드 개발자');
  const [company, setCompany] = useState('');
  const [messages, setMessages] = useState(INIT_MESSAGES);
  const [input, setInput]   = useState('');
  const [qNum, setQNum]     = useState(1);
  const [sec, setSec]       = useState(0);
  const [typing, setTyping] = useState(false);

  const bottomRef   = useRef(null);
  const timerRef    = useRef(null);
  const replyRef    = useRef(null);
  const textareaRef = useRef(null);

  const TOTAL_Q = 10;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // P2: 컴포넌트 언마운트 시 타이머/타임아웃 정리
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearTimeout(replyRef.current);
    };
  }, []);

  function startInterview() {
    clearTimeout(replyRef.current); // P1: 이전 세션의 pending 응답 취소
    setPhase('interview');
    setMessages(INIT_MESSAGES);
    setQNum(1);
    setSec(0);
    timerRef.current = setInterval(() => setSec(s => s + 1), 1000);
  }

  function endInterview() {
    clearInterval(timerRef.current);
    clearTimeout(replyRef.current); // P1: pending AI 응답 취소
    setTyping(false);
    setPhase('setup');
  }

  function handleSend() {
    if (!input.trim() || typing) return;
    const text = input.trim();
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setTyping(true);

    replyRef.current = setTimeout(() => { // P1: ref에 저장해 취소 가능하게
      setMessages(prev => [...prev, {
        role: 'ai',
        text: '답변 감사합니다. 말씀하신 내용을 바탕으로 추가로 여쭤볼게요.\n해당 상황에서 기술적인 선택의 근거는 무엇이었나요?',
      }]);
      setQNum(q => Math.min(q + 1, TOTAL_Q)); // P2: TOTAL_Q 초과 방지
      setTyping(false);
    }, 1400);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');

  /* ── Setup ─────────────────────────────── */
  if (phase === 'setup') {
    return (
      <div className="ti-setup">
        <div className="ti-setup__card">
          <p className="ti-setup__eyebrow">TEXT INTERVIEW</p>
          <h1 className="ti-setup__title">텍스트 면접 설정</h1>
          <p className="ti-setup__desc">
            이력서와 타겟 공고를 기반으로 AI가 맞춤 질문을 실시간 생성합니다.
          </p>

          <div className="ti-setup__resume">
            <FileText size={15} />
            <span>이력서_최종본.pdf</span>
            <span className="ti-setup__resume-badge">연결됨</span>
          </div>

          <div className="ti-setup__section">
            <label className="ti-setup__label">목표 직무</label>
            <div className="ti-setup__chips">
              {JOB_OPTIONS.map(j => (
                <button
                  key={j}
                  className={`ti-chip${job === j ? ' ti-chip--on' : ''}`}
                  onClick={() => setJob(j)}
                >
                  {j}
                </button>
              ))}
            </div>
          </div>

          <div className="ti-setup__section">
            <label className="ti-setup__label">타겟 기업</label>
            <input
              className="ti-setup__input"
              placeholder="ex) 토스, 카카오, 네이버"
              value={company}
              onChange={e => setCompany(e.target.value)}
            />
          </div>

          <button
            className="ti-setup__btn"
            onClick={startInterview}
            disabled={!company.trim()}
          >
            면접 시작하기 <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  /* ── Interview ──────────────────────────── */
  return (
    <div className="ti">

      {/* 헤더 */}
      <header className="ti-header">
        <div className="ti-header__left">
          <span className="ti-header__company">{company}</span>
          <span className="ti-header__sep">·</span>
          <span className="ti-header__job">{job}</span>
        </div>

        <div className="ti-header__center">
          <div className="ti-header__dots">
            {Array.from({ length: TOTAL_Q }, (_, i) => (
              <span
                key={i}
                className={`ti-dot${i < qNum - 1 ? ' ti-dot--done' : i === qNum - 1 ? ' ti-dot--cur' : ''}`}
              />
            ))}
          </div>
          <span className="ti-header__q">Q {qNum} / {TOTAL_Q}</span>
        </div>

        <div className="ti-header__right">
          <div className="ti-header__timer">
            <Clock size={13} />
            {mm}:{ss}
          </div>
          <button className="ti-header__exit" onClick={endInterview}>
            <X size={14} /> 종료
          </button>
        </div>
      </header>

      {/* 채팅 */}
      <div className="ti-chat">
        {messages.map((msg, i) => (
          <div key={i} className={`ti-msg ti-msg--${msg.role}`}>
            {msg.role === 'ai' && <div className="ti-msg__avatar">AI</div>}
            <div className="ti-msg__bubble">
              {msg.text.split('\n').map((line, j) => <p key={j}>{line}</p>)}
            </div>
          </div>
        ))}

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

      {/* 입력 */}
      <div className="ti-input-bar">
        <textarea
          ref={textareaRef}
          className="ti-input"
          placeholder="답변을 입력하세요… (Enter 전송 / Shift+Enter 줄바꿈)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={3}
        />
        <button
          className="ti-send"
          onClick={handleSend}
          disabled={!input.trim() || typing}
        >
          <Send size={18} />
        </button>
      </div>

    </div>
  );
}

export default TextInterviewPage;
