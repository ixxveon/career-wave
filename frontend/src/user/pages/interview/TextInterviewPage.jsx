import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, Clock, X, Lightbulb, SkipForward,
  FileText, Briefcase, CheckCircle2, Send,
} from 'lucide-react';
import './TextInterviewPage.css';

/* ── Mock 데이터 ── */
const MOCK_JOBS = [
  { id: 1, company: '카카오', position: '백엔드 개발자',  tags: ['Java', 'Spring', 'MySQL'] },
  { id: 2, company: '네이버', position: '서버 개발자',    tags: ['Go', 'Kubernetes', 'gRPC'] },
  { id: 3, company: '토스',   position: '서버 개발자',    tags: ['Kotlin', 'MSA', 'AWS'] },
  { id: 0, company: '',       position: '공고 없이 진행', tags: [] },
];

const MOCK_RESUMES = [
  { id: 1, name: '이가연_이력서_2026.pdf', date: '2026.03.15' },
  { id: 2, name: '이가연_이력서_2025.pdf', date: '2025.11.20' },
  { id: 0, name: '이력서 없이 진행',       date: '' },
];

const MOCK_QUESTIONS = [
  '간단한 자기소개와 지원 동기를 말씀해주세요.',
  '가장 어려웠던 기술적 문제와 해결 과정을 말씀해주세요.',
  '본인의 기술적 강점과 약점은 무엇인가요?',
  '협업 중 갈등 상황이 생겼을 때 어떻게 해결하셨나요?',
  '입사 후 커리어 목표는 어떻게 되시나요?',
];

function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ════════════════════════
   Setup View
════════════════════════ */
function SetupView({ onStart }) {
  const [job,    setJob]    = useState(null);
  const [resume, setResume] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="ti-setup">
      <div className="ti-setup__head">
        <button className="ti-setup__back" onClick={() => navigate('/interview')} type="button">
          <X size={18} />
        </button>
        <span className="eyebrow">TEXT INTERVIEW</span>
        <h1>면접 설정</h1>
        <p>연습할 공고와 이력서를 선택해주세요.</p>
      </div>

      <div className="ti-setup__body">
        {/* 공고 선택 */}
        <section className="ti-setup__section">
          <h2><Briefcase size={15} /> 어떤 공고로 연습할까요?</h2>
          <ul className="ti-setup__list">
            {MOCK_JOBS.map((j) => (
              <li key={j.id}>
                <button
                  className={`ti-setup__item ${job?.id === j.id ? 'is-selected' : ''}`}
                  onClick={() => setJob(j)}
                  type="button"
                >
                  <div className="ti-setup__item-info">
                    <strong>
                      {j.company ? `${j.company} · ${j.position}` : j.position}
                    </strong>
                    {j.tags.length > 0 && (
                      <div className="ti-setup__tags">
                        {j.tags.map(t => <span key={t}>{t}</span>)}
                      </div>
                    )}
                  </div>
                  {job?.id === j.id && <CheckCircle2 size={18} className="ti-setup__check" />}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* 이력서 선택 */}
        <section className="ti-setup__section">
          <h2><FileText size={15} /> 어떤 이력서를 사용할까요?</h2>
          <ul className="ti-setup__list">
            {MOCK_RESUMES.map((r) => (
              <li key={r.id}>
                <button
                  className={`ti-setup__item ${resume?.id === r.id ? 'is-selected' : ''}`}
                  onClick={() => setResume(r)}
                  type="button"
                >
                  <div className="ti-setup__item-info">
                    <strong>{r.name}</strong>
                    {r.date && <span>{r.date}</span>}
                  </div>
                  {resume?.id === r.id && <CheckCircle2 size={18} className="ti-setup__check" />}
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="ti-setup__footer">
        <div className="ti-setup__summary">
          {job    ? <span><CheckCircle2 size={13} /> {job.company || '공고 없이'} {job.position}</span> : <span className="is-empty">공고를 선택해주세요</span>}
          {resume ? <span><CheckCircle2 size={13} /> {resume.name}</span> : <span className="is-empty">이력서를 선택해주세요</span>}
        </div>
        <button
          className="ti-btn ti-btn--primary"
          onClick={() => onStart({ job, resume })}
          disabled={!job || !resume}
          type="button"
        >
          면접 시작 <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════
   Interview View
════════════════════════ */
function InterviewView({ config, onFinish }) {
  const [currentQ,  setCurrentQ]  = useState(0);
  const [answer,    setAnswer]    = useState('');
  const [history,   setHistory]   = useState([]);
  const [elapsed,   setElapsed]   = useState(0);
  const [showHist,  setShowHist]  = useState(false);
  const [showExit,  setShowExit]  = useState(false);
  const textareaRef = useRef(null);
  const navigate    = useNavigate();

  const total = MOCK_QUESTIONS.length;
  const q     = MOCK_QUESTIONS[currentQ];

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [currentQ]);

  const handleSubmit = () => {
    if (!answer.trim()) return;
    const next = [...history, { q, a: answer }];
    setHistory(next);
    setAnswer('');
    if (currentQ + 1 >= total) {
      onFinish(next);
    } else {
      setCurrentQ(i => i + 1);
      setShowHist(false);
    }
  };

  const handleSkip = () => {
    const next = [...history, { q, a: '(넘김)' }];
    setHistory(next);
    setAnswer('');
    if (currentQ + 1 >= total) {
      onFinish(next);
    } else {
      setCurrentQ(i => i + 1);
      setShowHist(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
  };

  const label = config.job?.company
    ? `${config.job.company} · ${config.job.position}`
    : config.job?.position ?? '일반 면접';

  return (
    <div className="ti-interview">
      {/* 상단 바 */}
      <div className="ti-bar">
        <div className="ti-bar__left">
          <div className="ti-progress">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`ti-progress__dot ${i < currentQ ? 'is-done' : i === currentQ ? 'is-current' : ''}`}
              />
            ))}
          </div>
          <span className="ti-bar__label">Q {currentQ + 1} / {total}</span>
        </div>
        <span className="ti-bar__job">{label}</span>
        <div className="ti-bar__right">
          <span className="ti-bar__timer"><Clock size={13} /> {formatTime(elapsed)}</span>
          <button className="ti-bar__exit" onClick={() => setShowExit(true)} type="button">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 메인 */}
      <div className="ti-main">

        {/* 질문 카드 */}
        <div className="ti-question">
          <div className="ti-question__avatar">AI</div>
          <div className="ti-question__bubble">{q}</div>
        </div>

        {/* 이전 대화 토글 */}
        {history.length > 0 && (
          <button
            className="ti-history-toggle"
            onClick={() => setShowHist(v => !v)}
            type="button"
          >
            이전 대화 {history.length}개 {showHist ? '접기 ▲' : '보기 ▼'}
          </button>
        )}

        {showHist && (
          <div className="ti-history">
            {history.map(({ q: hq, a: ha }, i) => (
              <div key={i} className="ti-history__item">
                <p className="ti-history__q"><span>Q{i + 1}</span> {hq}</p>
                <p className="ti-history__a">{ha}</p>
              </div>
            ))}
          </div>
        )}

        {/* 답변 입력 */}
        <div className="ti-answer">
          <textarea
            ref={textareaRef}
            className="ti-answer__input"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onKeyDown={handleKey}
            placeholder="답변을 입력하세요... (Ctrl+Enter로 제출)"
            rows={5}
          />
          <div className="ti-answer__actions">
            <div className="ti-answer__left">
              <button className="ti-action-btn" type="button">
                <Lightbulb size={14} /> 힌트
              </button>
              <button className="ti-action-btn" onClick={handleSkip} type="button">
                <SkipForward size={14} /> 넘기기
              </button>
            </div>
            <button
              className="ti-btn ti-btn--primary"
              onClick={handleSubmit}
              disabled={!answer.trim()}
              type="button"
            >
              답변 완료 <Send size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* 종료 확인 모달 */}
      {showExit && (
        <div className="ti-modal-overlay" onClick={() => setShowExit(false)}>
          <div className="ti-modal" onClick={e => e.stopPropagation()}>
            <h3>면접을 종료할까요?</h3>
            <p>지금까지의 답변은 저장되지 않아요.</p>
            <div className="ti-modal__btns">
              <button className="ti-btn ti-btn--ghost" onClick={() => setShowExit(false)} type="button">계속하기</button>
              <button className="ti-btn ti-btn--danger" onClick={() => navigate('/interview')} type="button">종료</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════
   Main
════════════════════════ */
export default function TextInterviewPage() {
  const navigate = useNavigate();
  const [phase,  setPhase]  = useState('setup');
  const [config, setConfig] = useState(null);

  const handleStart = (cfg) => {
    setConfig(cfg);
    setPhase('interview');
  };

  const handleFinish = () => {
    navigate('/interview/report');
  };

  if (phase === 'setup') return <SetupView onStart={handleStart} />;
  return <InterviewView config={config} onFinish={handleFinish} />;
}
