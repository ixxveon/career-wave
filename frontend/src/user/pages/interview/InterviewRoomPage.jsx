import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Clock, Send, Lightbulb, SkipForward, CheckCircle2,
  Briefcase, FileText, Video, MessageSquare, Camera,
  Mic, Eye, Activity, ChevronDown, ChevronUp,
} from 'lucide-react';
import './InterviewRoomPage.css';

/* ── Mock ── */
const MOCK_JOBS = [
  { id: 1, company: '카카오', position: '백엔드 개발자', tags: ['Java', 'Spring'] },
  { id: 2, company: '네이버', position: '서버 개발자',   tags: ['Go', 'Kubernetes'] },
  { id: 3, company: '토스',   position: '서버 개발자',   tags: ['Kotlin', 'MSA'] },
  { id: 0, company: '',       position: '공고 없이 진행', tags: [] },
];
const MOCK_RESUMES = [
  { id: 1, name: '홍길동_이력서_2026.pdf', date: '2026.03.15' },
  { id: 2, name: '홍길동_이력서_2025.pdf', date: '2025.11.20' },
  { id: 0, name: '이력서 없이 진행',       date: '' },
];
const MOCK_QUESTIONS = [
  '간단한 자기소개와 지원 동기를 말씀해주세요.',
  '가장 어려웠던 기술적 문제와 해결 과정을 말씀해주세요.',
  '본인의 기술적 강점과 약점은 무엇인가요?',
  '협업 중 갈등 상황이 생겼을 때 어떻게 해결하셨나요?',
  '입사 후 커리어 목표는 어떻게 되시나요?',
];

const MOCK_ANALYSIS = { gaze: 87, posture: 72, tone: 91, wpm: 143 };

function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ════════════════════════════
   Setup Phase (공통)
════════════════════════════ */
function SetupPhase({ mode, onStart, onBack }) {
  const [job,    setJob]    = useState(null);
  const [resume, setResume] = useState(null);
  const [camOk,  setCamOk]  = useState(false);

  const canStart = job && resume && (mode === 'text' || camOk);

  return (
    <div className="ir-setup">
      <div className="ir-setup__head">
        <button className="ir-icon-btn" onClick={onBack} type="button">
          <X size={17} />
        </button>
        <div className="ir-setup__mode">
          {mode === 'text'
            ? <><MessageSquare size={15} /> 텍스트 면접</>
            : <><Video size={15} /> 영상 면접</>
          }
        </div>
        <h1>면접 설정</h1>
        <p>공고와 이력서를 선택하면 AI가 맞춤 질문을 준비해요.</p>
      </div>

      <div className="ir-setup__body">
        {/* 공고 */}
        <section className="ir-setup__card">
          <h2><Briefcase size={14} /> 연습할 공고</h2>
          <ul className="ir-pick-list">
            {MOCK_JOBS.map(j => (
              <li key={j.id}>
                <button
                  className={`ir-pick-item ${job?.id === j.id ? 'is-on' : ''}`}
                  onClick={() => setJob(j)}
                  type="button"
                >
                  <div>
                    <strong>{j.company ? `${j.company} · ${j.position}` : j.position}</strong>
                    {j.tags.length > 0 && (
                      <div className="ir-tags">
                        {j.tags.map(t => <span key={t}>{t}</span>)}
                      </div>
                    )}
                  </div>
                  {job?.id === j.id && <CheckCircle2 size={16} />}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* 이력서 */}
        <section className="ir-setup__card">
          <h2><FileText size={14} /> 이력서</h2>
          <ul className="ir-pick-list">
            {MOCK_RESUMES.map(r => (
              <li key={r.id}>
                <button
                  className={`ir-pick-item ${resume?.id === r.id ? 'is-on' : ''}`}
                  onClick={() => setResume(r)}
                  type="button"
                >
                  <div>
                    <strong>{r.name}</strong>
                    {r.date && <span className="ir-pick-date">{r.date}</span>}
                  </div>
                  {resume?.id === r.id && <CheckCircle2 size={16} />}
                </button>
              </li>
            ))}
          </ul>

          {/* 영상 면접: 카메라 확인 */}
          {mode === 'video' && (
            <div className="ir-cam-check">
              <div className="ir-cam-check__preview">
                <Camera size={28} />
                <span>카메라 미리보기</span>
              </div>
              <button
                className={`ir-cam-check__btn ${camOk ? 'is-ok' : ''}`}
                onClick={() => setCamOk(v => !v)}
                type="button"
              >
                {camOk ? <><CheckCircle2 size={14} /> 확인 완료</> : <><Camera size={14} /> 카메라 · 마이크 확인</>}
              </button>
            </div>
          )}
        </section>
      </div>

      <div className="ir-setup__foot">
        <div className="ir-setup__confirm">
          <span className={job ? '' : 'is-empty'}>
            {job ? `✓ ${job.company || ''} ${job.position}` : '공고를 선택해주세요'}
          </span>
          <span className={resume ? '' : 'is-empty'}>
            {resume ? `✓ ${resume.name}` : '이력서를 선택해주세요'}
          </span>
          {mode === 'video' && (
            <span className={camOk ? '' : 'is-empty'}>
              {camOk ? '✓ 카메라 · 마이크 확인 완료' : '카메라를 확인해주세요'}
            </span>
          )}
        </div>
        <button
          className="ir-btn ir-btn--primary"
          disabled={!canStart}
          onClick={() => onStart({ job, resume })}
          type="button"
        >
          면접 시작 →
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════
   Text Interview Room
════════════════════════════ */
function TextRoom({ config, onFinish, onExit }) {
  const [qIdx,     setQIdx]     = useState(0);
  const [answer,   setAnswer]   = useState('');
  const [history,  setHistory]  = useState([]);
  const [elapsed,  setElapsed]  = useState(0);
  const [histOpen, setHistOpen] = useState(false);
  const [exitModal, setExitModal] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { ref.current?.focus(); }, [qIdx]);

  const submit = () => {
    if (!answer.trim()) return;
    const next = [...history, { q: MOCK_QUESTIONS[qIdx], a: answer }];
    setHistory(next);
    setAnswer('');
    if (qIdx + 1 >= MOCK_QUESTIONS.length) onFinish();
    else { setQIdx(i => i + 1); setHistOpen(false); }
  };

  const skip = () => {
    const next = [...history, { q: MOCK_QUESTIONS[qIdx], a: '(넘김)' }];
    setHistory(next);
    setAnswer('');
    if (qIdx + 1 >= MOCK_QUESTIONS.length) onFinish();
    else { setQIdx(i => i + 1); setHistOpen(false); }
  };

  const jobLabel = config.job?.company
    ? `${config.job.company} · ${config.job.position}`
    : config.job?.position ?? '';

  return (
    <div className="ir-room ir-room--text">
      {/* 상단 바 */}
      <div className="ir-topbar">
        <div className="ir-topbar__left">
          <div className="ir-dots">
            {MOCK_QUESTIONS.map((_, i) => (
              <span key={i} className={`ir-dot ${i < qIdx ? 'done' : i === qIdx ? 'cur' : ''}`} />
            ))}
          </div>
          <span className="ir-topbar__q">Q {qIdx + 1} / {MOCK_QUESTIONS.length}</span>
        </div>
        <span className="ir-topbar__job">{jobLabel}</span>
        <div className="ir-topbar__right">
          <span className="ir-timer"><Clock size={13} /> {formatTime(elapsed)}</span>
          <button className="ir-icon-btn" onClick={() => setExitModal(true)} type="button">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 질문 */}
      <div className="ir-question">
        <div className="ir-question__ai">AI</div>
        <p>{MOCK_QUESTIONS[qIdx]}</p>
      </div>

      {/* 이전 대화 */}
      {history.length > 0 && (
        <>
          <button
            className="ir-hist-toggle"
            onClick={() => setHistOpen(v => !v)}
            type="button"
          >
            이전 대화 {history.length}개 {histOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {histOpen && (
            <div className="ir-history">
              {history.map(({ q, a }, i) => (
                <div key={i} className="ir-history__row">
                  <p className="ir-history__q"><em>Q{i + 1}</em>{q}</p>
                  <p className="ir-history__a">{a}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* 답변 입력 */}
      <div className="ir-answer">
        <textarea
          ref={ref}
          className="ir-answer__ta"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
          placeholder="답변을 입력하세요… (Ctrl+Enter로 제출)"
          rows={5}
        />
        <div className="ir-answer__foot">
          <div className="ir-answer__tools">
            <button className="ir-tool-btn" type="button"><Lightbulb size={13} /> 힌트</button>
            <button className="ir-tool-btn" onClick={skip} type="button"><SkipForward size={13} /> 넘기기</button>
          </div>
          <button className="ir-btn ir-btn--primary" onClick={submit} disabled={!answer.trim()} type="button">
            답변 완료 <Send size={13} />
          </button>
        </div>
      </div>

      {exitModal && (
        <div className="ir-overlay" onClick={() => setExitModal(false)}>
          <div className="ir-modal" onClick={e => e.stopPropagation()}>
            <h3>면접을 종료할까요?</h3>
            <p>지금까지의 답변은 저장되지 않아요.</p>
            <div className="ir-modal__btns">
              <button className="ir-btn ir-btn--ghost" onClick={() => setExitModal(false)} type="button">계속하기</button>
              <button className="ir-btn ir-btn--danger" onClick={onExit} type="button">종료</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════
   Video Interview Room
════════════════════════════ */
function VideoRoom({ config, onFinish, onExit }) {
  const [qIdx,    setQIdx]    = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [panelOpen, setPanelOpen] = useState(true);
  const [exitModal, setExitModal] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const next = () => {
    if (qIdx + 1 >= MOCK_QUESTIONS.length) onFinish();
    else setQIdx(i => i + 1);
  };

  const jobLabel = config.job?.company
    ? `${config.job.company} · ${config.job.position}`
    : config.job?.position ?? '';

  return (
    <div className="ir-room ir-room--video">
      {/* 좌: 웹캠 영역 */}
      <div className="ir-video-main">
        <div className="ir-webcam">
          <div className="ir-webcam__placeholder">
            <Camera size={40} />
            <span>웹캠 연결 중…</span>
            <small>실제 구현 시 WebRTC 스트림이 표시됩니다</small>
          </div>
        </div>

        {/* 하단 질문 자막 + 컨트롤 */}
        <div className="ir-video-foot">
          <div className="ir-subtitle">
            <span className="ir-subtitle__q">Q {qIdx + 1}</span>
            {MOCK_QUESTIONS[qIdx]}
          </div>
          <div className="ir-video-ctrl">
            <span className="ir-rec"><span className="ir-rec__dot" />REC {formatTime(elapsed)}</span>
            <button className="ir-btn ir-btn--primary" onClick={next} type="button">답변 완료 →</button>
            <button className="ir-btn ir-btn--ghost" onClick={() => setExitModal(true)} type="button">종료</button>
          </div>
        </div>
      </div>

      {/* 우: 실시간 분석 패널 */}
      <div className={`ir-analysis ${panelOpen ? '' : 'is-collapsed'}`}>
        <button
          className="ir-analysis__toggle"
          onClick={() => setPanelOpen(v => !v)}
          type="button"
        >
          {panelOpen ? '분석 접기 ▶' : '◀'}
        </button>

        {panelOpen && (
          <>
            <div className="ir-analysis__head">
              <span>{jobLabel}</span>
              <span className="ir-timer"><Clock size={12} /> {formatTime(elapsed)}</span>
            </div>

            <h3>실시간 분석</h3>

            {[
              { icon: Eye,      label: '시선 처리', val: MOCK_ANALYSIS.gaze,    unit: '%' },
              { icon: Activity, label: '자세',      val: MOCK_ANALYSIS.posture,  unit: '%' },
              { icon: Mic,      label: '음성 톤',   val: MOCK_ANALYSIS.tone,     unit: '%' },
              { icon: MessageSquare, label: 'WPM',  val: MOCK_ANALYSIS.wpm,      unit: '' },
            ].map(({ icon: Icon, label, val, unit }) => (
              <div key={label} className="ir-metric">
                <div className="ir-metric__label">
                  <Icon size={13} /> {label}
                </div>
                <div className="ir-metric__bar">
                  <div className="ir-metric__fill" style={{ width: `${unit === '%' ? val : Math.min(val / 2, 100)}%` }} />
                </div>
                <span className="ir-metric__val">{val}{unit}</span>
              </div>
            ))}

            <div className="ir-analysis__progress">
              <span>진행</span>
              <span>Q {qIdx + 1} / {MOCK_QUESTIONS.length}</span>
            </div>
          </>
        )}
      </div>

      {exitModal && (
        <div className="ir-overlay" onClick={() => setExitModal(false)}>
          <div className="ir-modal" onClick={e => e.stopPropagation()}>
            <h3>면접을 종료할까요?</h3>
            <p>지금까지의 답변은 저장되지 않아요.</p>
            <div className="ir-modal__btns">
              <button className="ir-btn ir-btn--ghost" onClick={() => setExitModal(false)} type="button">계속하기</button>
              <button className="ir-btn ir-btn--danger" onClick={onExit} type="button">종료</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════
   Main Export
════════════════════════════ */
export default function InterviewRoomPage({ mode = 'text' }) {
  const navigate = useNavigate();
  const [phase,  setPhase]  = useState('setup');
  const [config, setConfig] = useState(null);

  if (phase === 'setup') {
    return (
      <SetupPhase
        mode={mode}
        onStart={(cfg) => { setConfig(cfg); setPhase('interview'); }}
        onBack={() => navigate('/interview')}
      />
    );
  }

  const Room = mode === 'video' ? VideoRoom : TextRoom;
  return (
    <Room
      config={config}
      onFinish={() => navigate('/interview/report')}
      onExit={() => navigate('/interview')}
    />
  );
}
