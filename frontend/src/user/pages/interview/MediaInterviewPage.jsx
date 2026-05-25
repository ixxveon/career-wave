import { useState, useRef, useEffect } from 'react';
import {
  Mic, MicOff, Video, VideoOff,
  X, Clock, ChevronRight,
  Eye, Activity, MessageSquare, Smile,
  BarChart2, Lightbulb, List,
} from 'lucide-react';
import './styles/MediaInterviewPage.css';

const JOB_OPTIONS = ['백엔드 개발자', '프론트엔드 개발자', '풀스택 개발자', '데이터 엔지니어', 'DevOps'];

const QUESTIONS = [
  '간단한 자기소개를 부탁드립니다.',
  '가장 어려웠던 프로젝트 경험을 말씀해주세요.',
  '본인의 강점과 약점은 무엇인가요?',
  '팀 내 갈등 상황을 어떻게 해결하셨나요?',
  '지원 동기가 무엇인가요?',
  '5년 후 목표를 말씀해주세요.',
  '실패 경험과 극복 과정을 말해주세요.',
  '협업 중 어려웠던 점은 무엇인가요?',
  '본인의 개발 철학은 무엇인가요?',
  '마지막으로 하고 싶은 말이 있으신가요?',
];

const HINTS = [
  ['STAR 기법', '직무 연관성', '간결하게'],
  ['구체적 수치', '기술 스택', '팀 기여도'],
  ['강점 2가지', '약점 + 극복', '진정성'],
  ['상황 설명', '내 역할', '결과'],
  ['회사 리서치', '성장 포인트', '열정'],
  ['구체적 목표', '현실적 계획', '회사 연결'],
  ['솔직한 경험', '배운 점', '재발 방지'],
  ['갈등 원인', '소통 방식', '해결 결과'],
  ['코드 품질', '문서화', '협업'],
  ['인상 남기기', '질문 준비', '자신감'],
];

const METRICS = [
  { Icon: Eye,           label: '시선 안정도', value: 82,    unit: '%',      color: '#22c55e' },
  { Icon: Activity,      label: 'WPM',         value: 138,   unit: '단어/분', color: '#60a5fa' },
  { Icon: MessageSquare, label: '말하기 속도', value: '보통', unit: '',       color: '#a78bfa' },
  { Icon: Smile,         label: '표정 감정',   value: '안정', unit: '',       color: '#fb923c' },
];

function MediaInterviewPage() {
  const [phase,   setPhase]   = useState('setup');
  const [job,     setJob]     = useState('백엔드 개발자');
  const [company, setCompany] = useState('');
  const [micOn,   setMicOn]   = useState(true);
  const [camOn,   setCamOn]   = useState(true);
  const [qIdx,    setQIdx]    = useState(0);
  const [sec,     setSec]     = useState(0);
  const [stream,  setStream]  = useState(null);
  const [camErr,  setCamErr]  = useState(false);

  const setupVidRef = useRef(null);
  const liveVidRef  = useRef(null);
  const timerRef    = useRef(null);

  /* ── 카메라 스트림 획득 ─────────────────────── */
  useEffect(() => {
    let cancelled = false;
    let localStream = null;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(s => {
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        localStream = s;
        setStream(s);
      })
      .catch(() => { if (!cancelled) setCamErr(true); });

    return () => {
      cancelled = true;
      localStream?.getTracks().forEach(t => t.stop());
      setStream(null);
    };
  }, []);

  /* ── 스트림 → 비디오 엘리먼트 연결 ────────── */
  useEffect(() => {
    if (!stream) return;
    const video = phase === 'setup' ? setupVidRef.current : liveVidRef.current;
    if (!video) return;
    video.srcObject = stream;
    video.play().catch(() => {});
  }, [stream, phase]);

  /* ── 타이머 ─────────────────────────────────── */
  useEffect(() => {
    if (phase === 'interview') {
      timerRef.current = setInterval(() => setSec(s => s + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  /* ── 트랙 토글 ──────────────────────────────── */
  useEffect(() => {
    stream?.getAudioTracks().forEach(t => { t.enabled = micOn; });
  }, [micOn, stream]);

  useEffect(() => {
    stream?.getVideoTracks().forEach(t => { t.enabled = camOn; });
  }, [camOn, stream]);

  function startInterview() { setSec(0); setQIdx(0); setPhase('interview'); }
  function endInterview()   { clearInterval(timerRef.current); setSec(0); setQIdx(0); setPhase('setup'); }

  const TOTAL_Q = 10;
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');

  /* ── Setup ─────────────────────────────────── */
  if (phase === 'setup') {
    return (
      <div className="mi-setup">
        <div className="mi-setup__card">
          <p className="mi-setup__eyebrow">VIDEO INTERVIEW</p>
          <h1 className="mi-setup__title">화상 면접 설정</h1>
          <p className="mi-setup__desc">
            웹캠과 마이크를 통해 실전 면접 환경을 구성합니다.<br />
            AI가 시선·자세·음성 톤·표정을 실시간 분석합니다.
          </p>

          <div className="mi-setup__preview">
            {camErr ? (
              <div className="mi-setup__cam-err">
                <VideoOff size={32} />
                <span>카메라 접근 권한이 필요합니다</span>
              </div>
            ) : (
              <video ref={setupVidRef} autoPlay muted playsInline className="mi-setup__video" />
            )}
            <div className="mi-setup__preview-overlay">
              <button
                className={`mi-icon-btn${micOn ? '' : ' mi-icon-btn--off'}`}
                onClick={() => setMicOn(m => !m)}
              >
                {micOn ? <Mic size={16} /> : <MicOff size={16} />}
              </button>
              <button
                className={`mi-icon-btn${camOn ? '' : ' mi-icon-btn--off'}`}
                onClick={() => setCamOn(c => !c)}
              >
                {camOn ? <Video size={16} /> : <VideoOff size={16} />}
              </button>
            </div>
          </div>

          <div className="mi-setup__section">
            <label className="mi-setup__label">목표 직무</label>
            <div className="mi-setup__chips">
              {JOB_OPTIONS.map(j => (
                <button key={j} className={`mi-chip${job === j ? ' mi-chip--on' : ''}`} onClick={() => setJob(j)}>
                  {j}
                </button>
              ))}
            </div>
          </div>

          <div className="mi-setup__section">
            <label className="mi-setup__label">타겟 기업</label>
            <input
              className="mi-setup__input"
              placeholder="ex) 토스, 카카오, 네이버"
              value={company}
              onChange={e => setCompany(e.target.value)}
            />
          </div>

          <button className="mi-setup__btn" onClick={startInterview} disabled={!company.trim()}>
            면접 시작하기 <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  /* ── Interview ──────────────────────────────── */
  return (
    <div className="mi">
      <header className="mi-header">
        <div className="mi-header__left">
          <span className="mi-header__company">{company}</span>
          <span className="mi-header__sep">·</span>
          <span className="mi-header__job">{job}</span>
        </div>
        <div className="mi-header__center">
          <div className="mi-header__dots">
            {Array.from({ length: TOTAL_Q }, (_, i) => (
              <span key={i} className={`mi-dot${i < qIdx ? ' mi-dot--done' : i === qIdx ? ' mi-dot--cur' : ''}`} />
            ))}
          </div>
          <span className="mi-header__q">Q {qIdx + 1} / {TOTAL_Q}</span>
        </div>
        <div className="mi-header__right">
          <div className="mi-header__timer"><Clock size={13} />{mm}:{ss}</div>
          <button className="mi-header__exit" onClick={endInterview}><X size={14} /> 종료</button>
        </div>
      </header>

      <div className="mi-main">
        <div className="mi-cam-wrap">
          <video ref={liveVidRef} autoPlay muted playsInline className="mi-cam" />
          {!camOn && (
            <div className="mi-cam__off"><VideoOff size={44} /><span>카메라 꺼짐</span></div>
          )}
          <div className="mi-cam__rec"><span className="mi-cam__rec-dot" /> REC</div>

          {/* 질문 오버레이 */}
          <div className="mi-cam__caption">
            <p className="mi-cam__caption-text">
              {QUESTIONS[qIdx] ?? QUESTIONS[QUESTIONS.length - 1]}
              <span className="mi-cam__caption-num"> ({qIdx + 1}/{TOTAL_Q})</span>
            </p>
          </div>
        </div>

        <aside className="mi-panel">

          {/* AI 분석 */}
          <div className="mi-panel__block">
            <p className="mi-panel__heading"><BarChart2 size={12} /> 실시간 AI 분석</p>
            <div className="mi-metric-grid">
              {METRICS.map(({ Icon, label, value, unit, color }, i) => (
                <div key={i} className="mi-metric-card" style={{ '--mc': color }}>
                  <div className="mi-metric-card__icon"><Icon size={14} /></div>
                  <div className="mi-metric-card__value">
                    {value}
                    {unit && <span className="mi-metric-card__unit">{unit}</span>}
                  </div>
                  <div className="mi-metric-card__label">{label}</div>
                  {typeof value === 'number' && (
                    <div className="mi-metric-card__bar">
                      <div className="mi-metric-card__fill" style={{ width: `${value}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 답변 핵심 포인트 */}
          <div className="mi-panel__block">
            <p className="mi-panel__heading"><Lightbulb size={12} /> 답변 핵심 포인트</p>
            <div className="mi-hints">
              {(HINTS[qIdx] ?? HINTS[0]).map((hint, i) => (
                <span key={i} className="mi-hint-chip">{hint}</span>
              ))}
            </div>
          </div>

          {/* 질문 진행 현황 */}
          <div className="mi-panel__block mi-panel__block--progress">
            <p className="mi-panel__heading"><List size={12} /> 진행 현황</p>
            <ol className="mi-q-list">
              {QUESTIONS.map((q, i) => (
                <li
                  key={i}
                  className={`mi-q-item${i === qIdx ? ' mi-q-item--cur' : i < qIdx ? ' mi-q-item--done' : ' mi-q-item--pending'}`}
                  onClick={() => i <= qIdx && setQIdx(i)}
                >
                  <span className="mi-q-item__num">{i + 1}</span>
                  <span className="mi-q-item__text">
                    {i <= qIdx ? (q.slice(0, 16) + (q.length > 16 ? '…' : '')) : '---'}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* 다음 질문 */}
          <div className="mi-panel__block">
            <button
              className="mi-q-nav__btn mi-q-nav__btn--next"
              style={{ width: '100%' }}
              onClick={() => setQIdx(q => Math.min(q + 1, TOTAL_Q - 1))}
              disabled={qIdx >= TOTAL_Q - 1}
            >다음 질문 →</button>
          </div>

        </aside>
      </div>

      <div className="mi-controls">
        <div className="mi-controls__left">
          <button className={`mi-ctrl-btn${micOn ? '' : ' mi-ctrl-btn--off'}`} onClick={() => setMicOn(m => !m)}>
            {micOn ? <Mic size={17} /> : <MicOff size={17} />}
            {micOn ? '마이크' : '음소거'}
          </button>
          <button className={`mi-ctrl-btn${camOn ? '' : ' mi-ctrl-btn--off'}`} onClick={() => setCamOn(c => !c)}>
            {camOn ? <Video size={17} /> : <VideoOff size={17} />}
            {camOn ? '카메라' : '카메라 꺼짐'}
          </button>
        </div>
        <div className="mi-controls__q-hint">
          Q {qIdx + 1} / {TOTAL_Q} · {QUESTIONS[qIdx]?.slice(0, 18)}…
        </div>
      </div>
    </div>
  );
}

export default MediaInterviewPage;
