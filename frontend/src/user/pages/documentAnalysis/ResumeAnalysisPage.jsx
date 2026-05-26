import { useState, useRef } from 'react';
import {
  Upload, FileText, X, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, Gauge, Lightbulb, TrendingUp,
} from 'lucide-react';
import './styles/ResumeAnalysisPage.css';

/* ── Mock 분석 결과 ──────────────────────────── */
const MOCK_RESULT = {
  fileName:    '이력서_최종본.pdf',
  job:         '백엔드 개발자',
  fitScore:    82,
  keywords:    ['Spring Boot', 'AWS', 'PostgreSQL', 'Docker', 'Redis'],
  missing:     ['Kubernetes', 'CI/CD', '대용량 트래픽'],
  feedbacks: [
    {
      original: '결제 시스템 개발에 참여하였습니다.',
      improved: '월 거래액 50억 규모의 결제 시스템 API를 Spring Boot로 설계 및 구현, TPS 300 처리 안정화에 기여하였습니다.',
      reason:   '수치(거래액, TPS)와 기술 스택을 명시해 성과를 구체화했습니다.',
      tag:      'kpi',
    },
    {
      original: '팀원들과 협업하여 서비스를 개선했습니다.',
      improved: '5인 팀 스크럼 환경에서 백엔드 리드로 API 응답 속도를 평균 340ms → 80ms로 개선하였습니다.',
      reason:   '팀 규모, 역할, 수치화된 개선 결과를 추가해 임팩트를 강조했습니다.',
      tag:      'kpi',
    },
    {
      original: '다양한 경험을 통해 성장하였습니다.',
      improved: '스타트업 3곳에서 백엔드 풀사이클 개발(기획→설계→배포)을 수행하며 서비스 런칭 경험을 쌓았습니다.',
      reason:   '"다양한 경험"이라는 추상적 표현을 구체적 경력 사실로 대체했습니다.',
      tag:      'vague',
    },
  ],
};

const TAG_META = {
  kpi:   { label: 'KPI 부족', color: '#f59e0b', bg: '#fef3c7' },
  vague: { label: '모호한 표현', color: '#a78bfa', bg: '#ede9fe' },
};

function FitGauge({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 65 ? '#60a5fa' : '#f87171';
  return (
    <div className="ra-gauge">
      <svg viewBox="0 0 120 70" className="ra-gauge__svg">
        <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
        <path
          d="M10,60 A50,50 0 0,1 110,60"
          fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${157 * score / 100} 157`}
        />
      </svg>
      <div className="ra-gauge__label">
        <span className="ra-gauge__value" style={{ color }}>{score}</span>
        <span className="ra-gauge__sub">/ 100</span>
      </div>
    </div>
  );
}

function FeedbackItem({ item, index }) {
  const [open, setOpen] = useState(false);
  const meta = TAG_META[item.tag];

  return (
    <div className={`ra-fb-item${open ? ' ra-fb-item--open' : ''}`}>
      <button className="ra-fb-item__head" onClick={() => setOpen(v => !v)}>
        <span className="ra-fb-item__tag" style={{ color: meta.color, background: meta.bg }}>
          {meta.label}
        </span>
        <span className="ra-fb-item__original">{item.original}</span>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && (
        <div className="ra-fb-item__body">
          <div className="ra-fb-item__improved">
            <span className="ra-fb-item__section-label"><TrendingUp size={12} /> AI 개선 문장</span>
            <p>{item.improved}</p>
          </div>
          <div className="ra-fb-item__reason">
            <span className="ra-fb-item__section-label"><Lightbulb size={12} /> 개선 이유</span>
            <p>{item.reason}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResumeAnalysisPage() {
  const [phase, setPhase]       = useState('upload'); // 'upload' | 'result'
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState(null);
  const [job, setJob]           = useState('');
  const inputRef                = useRef(null);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  if (phase === 'result') {
    const r = MOCK_RESULT;
    return (
      <div className="ra">
        {/* 결과 헤더 */}
        <div className="ra-result-banner">
          <div className="ra-result-banner__left">
            <span className="ra-eyebrow">RESUME ANALYSIS</span>
            <h1 className="ra-result-banner__title">{r.fileName}</h1>
            <p className="ra-result-banner__job">분석 직무: <strong>{r.job}</strong></p>
          </div>
          <button className="ra-btn ra-btn--outline" onClick={() => { setPhase('upload'); setFile(null); }}>
            <Upload size={14} /> 다시 업로드
          </button>
        </div>

        {/* 직무 적합도 + 키워드 */}
        <div className="ra-score-row">
          <div className="ra-card ra-score-card">
            <p className="ra-card__title"><Gauge size={14} /> 직무 적합도</p>
            <FitGauge score={r.fitScore} />
            <p className="ra-score-card__desc">
              {r.fitScore >= 80 ? '합격 가능성이 높습니다.' : r.fitScore >= 65 ? '보완 후 지원을 추천합니다.' : '이력서 개선이 필요합니다.'}
            </p>
          </div>

          <div className="ra-card ra-kw-card">
            <p className="ra-card__title"><CheckCircle2 size={14} /> 감지된 키워드</p>
            <div className="ra-kw-list">
              {r.keywords.map(k => (
                <span key={k} className="ra-kw ra-kw--hit">{k}</span>
              ))}
            </div>
            <p className="ra-card__title ra-card__title--mt"><AlertCircle size={14} /> 부족한 키워드</p>
            <div className="ra-kw-list">
              {r.missing.map(k => (
                <span key={k} className="ra-kw ra-kw--miss">{k}</span>
              ))}
            </div>
          </div>
        </div>

        {/* AI 피드백 */}
        <div className="ra-card">
          <p className="ra-card__title"><TrendingUp size={14} /> AI 문장 개선 제안 ({r.feedbacks.length}건)</p>
          <div className="ra-fb-list">
            {r.feedbacks.map((item, i) => (
              <FeedbackItem key={i} item={item} index={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* 업로드 화면 */
  return (
    <div className="ra">
      <div className="ra-upload-wrap">
        <span className="ra-eyebrow">RESUME ANALYSIS</span>
        <h1 className="ra-upload__title">이력서 AI 분석</h1>
        <p className="ra-upload__desc">
          PDF 또는 Word 파일을 업로드하면 AI가 직무 적합도와<br />
          KPI 부족 문장을 찾아 개선 문장을 제안해드립니다.
        </p>

        {/* 드래그 앤 드롭 영역 */}
        <div
          className={`ra-dropzone${dragging ? ' ra-dropzone--over' : ''}${file ? ' ra-dropzone--filled' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
          {file ? (
            <div className="ra-dropzone__file">
              <FileText size={28} />
              <span>{file.name}</span>
              <button className="ra-dropzone__remove" onClick={e => { e.stopPropagation(); setFile(null); }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={32} className="ra-dropzone__icon" />
              <p className="ra-dropzone__label">파일을 드래그하거나 클릭해서 업로드</p>
              <p className="ra-dropzone__hint">PDF, DOC, DOCX · 최대 10MB</p>
            </>
          )}
        </div>

        {/* 직무 입력 */}
        <div className="ra-field">
          <label className="ra-field__label">분석 기준 직무</label>
          <input
            className="ra-field__input"
            placeholder="ex) 백엔드 개발자, 프론트엔드 개발자"
            value={job}
            onChange={e => setJob(e.target.value)}
          />
        </div>

        <button
          className="ra-btn ra-btn--primary"
          disabled={!file || !job.trim()}
          onClick={() => setPhase('result')}
        >
          AI 분석 시작하기
        </button>
      </div>
    </div>
  );
}
