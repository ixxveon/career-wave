import { useState } from 'react';
import { ChevronLeft, FileText, User, ShieldCheck, Send, CheckCircle2, ChevronDown } from 'lucide-react';
import './styles/ApplyPage.css';

const MOCK_RESUMES = [
  { id: 1, title: '백엔드 개발자 이력서 v3', updatedAt: '2025-05-18', score: 88 },
  { id: 2, title: '풀스택 지원용 이력서', updatedAt: '2025-05-10', score: 75 },
];

const MOCK_COVERS = [
  { id: 1, title: '성장 중심 자기소개서', updatedAt: '2025-05-19', score: 82 },
  { id: 2, title: '문제 해결 경험 중심', updatedAt: '2025-05-12', score: 70 },
];

const JOB = { company: '토스', title: '백엔드 개발자', deadline: '2025-06-30' };

const STEPS = ['공고 확인', '서류 선택', '제출 확인'];

export default function ApplyPage() {
  const [step,         setStep]         = useState(0);
  const [resumeId,     setResumeId]     = useState(null);
  const [coverId,      setCoverId]      = useState(null);
  const [agreed,       setAgreed]       = useState(false);
  const [submitted,    setSubmitted]    = useState(false);

  function canNext() {
    if (step === 0) return true;
    if (step === 1) return resumeId && coverId;
    if (step === 2) return agreed;
    return false;
  }

  function handleNext() {
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="ap-page">
        <div className="ap-done">
          <div className="ap-done__icon"><CheckCircle2 size={52} /></div>
          <h2 className="ap-done__title">지원 완료!</h2>
          <p className="ap-done__desc">
            <strong>{JOB.company}</strong> · {JOB.title} 공고에 지원서가 성공적으로 제출되었습니다.<br />
            지원 현황은 <em>지원 현황</em> 페이지에서 확인할 수 있습니다.
          </p>
          <button className="ap-btn ap-btn--primary" onClick={() => { setSubmitted(false); setStep(0); setResumeId(null); setCoverId(null); setAgreed(false); }}>
            새 공고 지원하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ap-page">
      <div className="ap-header">
        <span className="ap-eyebrow">APPLY</span>
        <h1 className="ap-header__title">입사지원</h1>
        <p className="ap-header__desc">저장된 이력서와 자기소개서를 선택하고 최종 확인 후 제출합니다.</p>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="ap-steps">
        {STEPS.map((s, i) => (
          <div key={i} className={`ap-step${i === step ? ' ap-step--cur' : i < step ? ' ap-step--done' : ''}`}>
            <div className="ap-step__dot">
              {i < step ? <CheckCircle2 size={16} /> : <span>{i + 1}</span>}
            </div>
            {i < STEPS.length - 1 && <div className="ap-step__line" />}
            <span className="ap-step__label">{s}</span>
          </div>
        ))}
      </div>

      {/* 공고 확인 */}
      {step === 0 && (
        <div className="ap-card">
          <div className="ap-job">
            <div className="ap-job__logo">{JOB.company[0]}</div>
            <div className="ap-job__info">
              <p className="ap-job__company">{JOB.company}</p>
              <p className="ap-job__title">{JOB.title}</p>
              <p className="ap-job__deadline">마감일 · {JOB.deadline}</p>
            </div>
          </div>
          <div className="ap-checklist">
            <p className="ap-checklist__title">지원 전 체크리스트</p>
            {['이력서가 최신 버전으로 업데이트되었습니다.', '자기소개서가 해당 공고에 맞게 작성되었습니다.', '공고의 자격 요건을 충족합니다.'].map((t, i) => (
              <div key={i} className="ap-checklist__item">
                <CheckCircle2 size={16} className="ap-checklist__icon" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 서류 선택 */}
      {step === 1 && (
        <div className="ap-card">
          <div className="ap-section">
            <p className="ap-section__title"><FileText size={15} /> 이력서 선택</p>
            <div className="ap-doc-list">
              {MOCK_RESUMES.map(r => (
                <div
                  key={r.id}
                  className={`ap-doc${resumeId === r.id ? ' ap-doc--on' : ''}`}
                  onClick={() => setResumeId(r.id)}
                >
                  <div className="ap-doc__radio" />
                  <div className="ap-doc__info">
                    <p className="ap-doc__name">{r.title}</p>
                    <p className="ap-doc__meta">업데이트 {r.updatedAt}</p>
                  </div>
                  <span className={`ap-doc__score${r.score >= 85 ? ' ap-doc__score--high' : r.score >= 70 ? ' ap-doc__score--mid' : ' ap-doc__score--low'}`}>
                    {r.score}점
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="ap-section">
            <p className="ap-section__title"><User size={15} /> 자기소개서 선택</p>
            <div className="ap-doc-list">
              {MOCK_COVERS.map(c => (
                <div
                  key={c.id}
                  className={`ap-doc${coverId === c.id ? ' ap-doc--on' : ''}`}
                  onClick={() => setCoverId(c.id)}
                >
                  <div className="ap-doc__radio" />
                  <div className="ap-doc__info">
                    <p className="ap-doc__name">{c.title}</p>
                    <p className="ap-doc__meta">업데이트 {c.updatedAt}</p>
                  </div>
                  <span className={`ap-doc__score${c.score >= 85 ? ' ap-doc__score--high' : c.score >= 70 ? ' ap-doc__score--mid' : ' ap-doc__score--low'}`}>
                    {c.score}점
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 제출 확인 */}
      {step === 2 && (
        <div className="ap-card">
          <div className="ap-confirm">
            <div className="ap-confirm__icon"><ShieldCheck size={36} /></div>
            <p className="ap-confirm__title">최종 제출 확인</p>
            <p className="ap-confirm__desc">아래 정보로 지원서를 제출합니다. 제출 후에는 수정이 불가합니다.</p>
          </div>
          <div className="ap-summary">
            <div className="ap-summary__row">
              <span className="ap-summary__key">공고</span>
              <span className="ap-summary__val">{JOB.company} · {JOB.title}</span>
            </div>
            <div className="ap-summary__row">
              <span className="ap-summary__key">이력서</span>
              <span className="ap-summary__val">{MOCK_RESUMES.find(r => r.id === resumeId)?.title ?? '-'}</span>
            </div>
            <div className="ap-summary__row">
              <span className="ap-summary__key">자기소개서</span>
              <span className="ap-summary__val">{MOCK_COVERS.find(c => c.id === coverId)?.title ?? '-'}</span>
            </div>
          </div>
          <label className="ap-agree">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
            <span>개인정보 수집 및 이용에 동의합니다.</span>
          </label>
        </div>
      )}

      {/* 네비게이션 */}
      <div className="ap-nav">
        {step > 0 && (
          <button className="ap-btn ap-btn--outline" onClick={() => setStep(s => s - 1)}>
            <ChevronLeft size={14} /> 이전
          </button>
        )}
        <button className="ap-btn ap-btn--primary" disabled={!canNext()} onClick={handleNext}>
          {step < STEPS.length - 1 ? '다음' : <><Send size={14} /> 지원 제출</>}
        </button>
      </div>
    </div>
  );
}
