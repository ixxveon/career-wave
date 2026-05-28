import { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Bot, Database } from 'lucide-react';
import './styles/JobScrapingPage.css';

const SOURCES = [
  { name: '원티드',       url: 'wanted.co.kr',    status: 'done',    count: 1240, lastAt: '2025-05-25 09:00' },
  { name: '로켓펀치',     url: 'rocketpunch.com', status: 'done',    count: 380,  lastAt: '2025-05-25 09:02' },
  { name: '프로그래머스', url: 'programmers.co.kr',status: 'done',   count: 560,  lastAt: '2025-05-25 09:05' },
  { name: '잡코리아',     url: 'jobkorea.co.kr',  status: 'error',   count: 0,    lastAt: '2025-05-24 22:00' },
  { name: '사람인',       url: 'saramin.co.kr',   status: 'pending', count: null, lastAt: null },
];

const STATUS_META = {
  done:    { label: '완료',    icon: CheckCircle2, color: '#22c55e' },
  error:   { label: '오류',    icon: AlertCircle,  color: '#ef4444' },
  pending: { label: '대기 중', icon: Clock,        color: '#94a3b8' },
  running: { label: '수집 중', icon: RefreshCw,    color: '#60a5fa' },
};

export default function JobScrapingPage() {
  const [sources, setSources] = useState(SOURCES);
  const [running, setRunning] = useState(false);

  const total  = sources.reduce((s, r) => s + (r.count ?? 0), 0);
  const errors = sources.filter(r => r.status === 'error').length;

  function runAll() {
    setRunning(true);
    setSources(prev => prev.map(s => ({ ...s, status: 'running' })));
    setTimeout(() => {
      setSources(prev => prev.map(s => ({
        ...s,
        status: 'done',
        count:  (s.count ?? 0) + Math.floor(Math.random() * 50),
        lastAt: new Date().toLocaleString('ko-KR', { hour12: false }).replace(',', ''),
      })));
      setRunning(false);
    }, 2500);
  }

  return (
    <div className="js">
      {/* 헤더 */}
      <div className="js-banner">
        <div className="js-banner__left">
          <span className="js-eyebrow"><Bot size={11} /> AI SCRAPING ENGINE</span>
          <h1 className="js-banner__title">공고 스크래핑 현황</h1>
          <p className="js-banner__desc">admin-fastapi 기반 채용 공고 자동 수집 엔진입니다.</p>
        </div>
        <button className={`js-run-btn${running ? ' js-run-btn--running' : ''}`} onClick={runAll} disabled={running}>
          <RefreshCw size={15} className={running ? 'js-spin' : ''} />
          {running ? '수집 중...' : '전체 수집 실행'}
        </button>
      </div>

      {/* 요약 통계 */}
      <div className="js-stats">
        <div className="js-stat">
          <Database size={18} />
          <span className="js-stat__value">{total.toLocaleString()}</span>
          <span className="js-stat__label">총 수집 공고</span>
        </div>
        <div className="js-stat">
          <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
          <span className="js-stat__value">{sources.filter(s => s.status === 'done').length}</span>
          <span className="js-stat__label">정상 소스</span>
        </div>
        <div className="js-stat">
          <AlertCircle size={18} style={{ color: '#ef4444' }} />
          <span className="js-stat__value">{errors}</span>
          <span className="js-stat__label">오류 소스</span>
        </div>
      </div>

      {/* 소스 목록 */}
      <div className="js-card">
        <h2 className="js-card__title">수집 소스 현황</h2>
        <div className="js-source-list">
          {sources.map((src, i) => {
            const meta = STATUS_META[src.status];
            const Icon = meta.icon;
            return (
              <div key={i} className="js-source">
                <div className="js-source__info">
                  <p className="js-source__name">{src.name}</p>
                  <p className="js-source__url">{src.url}</p>
                </div>
                <div className="js-source__meta">
                  {src.count !== null && (
                    <span className="js-source__count">{src.count.toLocaleString()}건</span>
                  )}
                  {src.lastAt && (
                    <span className="js-source__time"><Clock size={11} /> {src.lastAt}</span>
                  )}
                </div>
                <span className="js-source__status" style={{ color: meta.color }}>
                  <Icon size={14} className={src.status === 'running' ? 'js-spin' : ''} />
                  {meta.label}
                </span>
                <button
                  className="js-source__btn"
                  disabled={running}
                  onClick={() => {
                    setSources(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s));
                    setTimeout(() => {
                      setSources(prev => prev.map((s, idx) => idx === i
                        ? { ...s, status: 'done', count: (s.count ?? 0) + Math.floor(Math.random() * 30), lastAt: new Date().toLocaleString('ko-KR', { hour12: false }).replace(',', '') }
                        : s
                      ));
                    }, 1500);
                  }}
                >
                  수집
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
