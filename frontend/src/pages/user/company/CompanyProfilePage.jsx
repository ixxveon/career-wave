import { useState } from 'react';
import { Building2, MapPin, Users, Globe, Edit3, Eye, CheckCircle2, Plus, X, Briefcase } from 'lucide-react';
import './styles/CompanyProfilePage.css';

const WELFARE_PRESETS = ['자율 출퇴근', '재택근무', '성과급', '스톡옵션', '건강검진', '점심 제공', '교육비 지원', '사내 카페'];

const MOCK = {
  name: '(주)캐리어웨이브', industry: 'IT / SaaS', size: '50~100명',
  location: '서울특별시 강남구 테헤란로 123', website: 'https://careerwave.io',
  founded: '2022', description: '커리어웨이브는 AI 기반 채용 플랫폼으로, 구직자와 기업의 채용 과정을 더 스마트하게 연결합니다. 자동화된 이력서 분석과 AI 면접으로 더 빠른 채용을 경험하세요.',
  stacks: ['React', 'Spring Boot', 'FastAPI', 'PostgreSQL', 'AWS'],
  welfare: ['자율 출퇴근', '재택근무', '성과급', '교육비 지원'],
  openings: 3,
};

function PreviewModal({ form, onClose }) {
  return (
    <div className="cp-modal-backdrop" onClick={onClose}>
      <div className="cp-modal" onClick={e => e.stopPropagation()}>
        <div className="cp-modal__header">
          <span className="cp-modal__label">구직자 화면 미리보기</span>
          <button className="cp-modal__close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="cp-modal__body">
          {/* 기업 헤더 */}
          <div className="cp-preview__hero">
            <div className="cp-preview__logo">{form.name[0]}</div>
            <div>
              <p className="cp-preview__name">{form.name}</p>
              <div className="cp-preview__meta">
                <span><Briefcase size={12} /> {form.industry}</span>
                <span><Users size={12} /> {form.size}</span>
                <span><MapPin size={12} /> {form.location}</span>
                <span><Globe size={12} /><a href={form.website} target="_blank" rel="noreferrer">{form.website}</a></span>
              </div>
            </div>
          </div>

          {/* 기업 소개 */}
          <div className="cp-preview__section">
            <p className="cp-preview__section-title">기업 소개</p>
            <p className="cp-preview__desc">{form.description}</p>
          </div>

          {/* 기술 스택 */}
          <div className="cp-preview__section">
            <p className="cp-preview__section-title">기술 스택</p>
            <div className="cp-preview__stacks">
              {form.stacks.map(s => <span key={s} className="cp-preview__stack">{s}</span>)}
            </div>
          </div>

          {/* 복지 */}
          <div className="cp-preview__section">
            <p className="cp-preview__section-title">복지 및 혜택</p>
            <div className="cp-preview__welfares">
              {form.welfare.map(w => <span key={w} className="cp-preview__welfare">{w}</span>)}
            </div>
          </div>

          {/* 채용 공고 수 */}
          <div className="cp-preview__openings">
            <Briefcase size={14} /> 진행 중인 채용공고 <strong>{form.openings}건</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompanyProfilePage() {
  const [mode,       setMode]       = useState('view');
  const [form,       setForm]       = useState(MOCK);
  const [stackInput, setStackInput] = useState('');
  const [preview,    setPreview]    = useState(false);

  function handleSave() {
    setMode('view');
  }

  function toggleWelfare(w) {
    setForm(f => ({
      ...f,
      welfare: f.welfare.includes(w) ? f.welfare.filter(x => x !== w) : [...f.welfare, w],
    }));
  }

  function addStack() {
    if (!stackInput.trim()) return;
    setForm(f => ({ ...f, stacks: [...f.stacks, stackInput.trim()] }));
    setStackInput('');
  }

  function removeStack(s) {
    setForm(f => ({ ...f, stacks: f.stacks.filter(x => x !== s) }));
  }

  const completeness = Math.round(
    ([form.name, form.industry, form.size, form.location, form.website, form.description, form.stacks.length > 0, form.welfare.length > 0]
      .filter(Boolean).length / 8) * 100
  );

  return (
    <div className="cp-page">
      {preview && <PreviewModal form={form} onClose={() => setPreview(false)} />}
      <div className="cp-header">
        <span className="cp-eyebrow">COMPANY</span>
        <h1 className="cp-header__title">기업 프로필</h1>
        <p className="cp-header__desc">기업 소개, 기술 스택, 복지 정보를 관리해 지원자에게 신뢰감 있는 채용 페이지를 제공합니다.</p>
      </div>

      {/* 완성도 + 액션 */}
      <div className="cp-topbar">
        <div className="cp-progress">
          <span className="cp-progress__label">프로필 완성도</span>
          <div className="cp-progress__bar">
            <div className="cp-progress__fill" style={{ width: `${completeness}%` }} />
          </div>
          <span className="cp-progress__pct">{completeness}%</span>
        </div>
        <div className="cp-topbar__actions">
          {mode === 'view'
            ? <button className="cp-btn cp-btn--outline" onClick={() => setMode('edit')}><Edit3 size={14} /> 수정하기</button>
            : <>
                <button className="cp-btn cp-btn--outline" onClick={() => setMode('view')}>취소</button>
                <button className="cp-btn cp-btn--primary" onClick={handleSave}><CheckCircle2 size={14} /> 저장</button>
              </>
          }
          <button className="cp-btn cp-btn--outline" onClick={() => setPreview(true)}><Eye size={14} /> 미리보기</button>
        </div>
      </div>

      <div className="cp-layout">
        {/* 기본 정보 */}
        <div className="cp-card">
          <p className="cp-card__title"><Building2 size={15} /> 기본 정보</p>
          {mode === 'view' ? (
            <div className="cp-info-list">
              <div className="cp-info"><span className="cp-info__key">회사명</span><span>{form.name}</span></div>
              <div className="cp-info"><span className="cp-info__key">산업군</span><span>{form.industry}</span></div>
              <div className="cp-info"><span className="cp-info__key">규모</span><span><Users size={13} /> {form.size}</span></div>
              <div className="cp-info"><span className="cp-info__key">위치</span><span><MapPin size={13} /> {form.location}</span></div>
              <div className="cp-info"><span className="cp-info__key">웹사이트</span><span><Globe size={13} /> {form.website}</span></div>
              <div className="cp-info"><span className="cp-info__key">설립</span><span>{form.founded}년</span></div>
            </div>
          ) : (
            <div className="cp-form">
              {[
                ['회사명', 'name'], ['산업군', 'industry'], ['규모', 'size'],
                ['위치', 'location'], ['웹사이트', 'website'], ['설립 연도', 'founded'],
              ].map(([label, key]) => (
                <div key={key} className="cp-field">
                  <label className="cp-field__label">{label}</label>
                  <input className="cp-input" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 기업 소개 */}
        <div className="cp-card">
          <p className="cp-card__title">기업 소개</p>
          {mode === 'view'
            ? <p className="cp-desc">{form.description}</p>
            : <textarea className="cp-textarea" rows={5} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          }
        </div>

        {/* 기술 스택 */}
        <div className="cp-card">
          <p className="cp-card__title">기술 스택</p>
          {mode === 'edit' && (
            <div className="cp-stack-input-wrap">
              <input
                className="cp-input" placeholder="스택 입력 후 추가"
                value={stackInput} onChange={e => setStackInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addStack()}
              />
              <button className="cp-add-btn" onClick={addStack}><Plus size={16} /></button>
            </div>
          )}
          <div className="cp-stacks">
            {form.stacks.map(s => (
              <span key={s} className="cp-stack">
                {s}
                {mode === 'edit' && <button onClick={() => removeStack(s)}><X size={11} /></button>}
              </span>
            ))}
          </div>
        </div>

        {/* 복지 */}
        <div className="cp-card">
          <p className="cp-card__title">복지 및 혜택</p>
          {mode === 'edit' ? (
            <div className="cp-welfare-presets">
              {WELFARE_PRESETS.map(w => (
                <button
                  key={w}
                  className={`cp-preset${form.welfare.includes(w) ? ' cp-preset--on' : ''}`}
                  onClick={() => toggleWelfare(w)}
                >
                  {form.welfare.includes(w) && <CheckCircle2 size={11} />} {w}
                </button>
              ))}
            </div>
          ) : (
            <div className="cp-welfares">
              {form.welfare.map(w => <span key={w} className="cp-welfare">{w}</span>)}
            </div>
          )}
        </div>

        {/* 채용 현황 */}
        <div className="cp-aside">
          <div className="cp-stat-card">
            <span className="cp-stat__value">{form.openings}</span>
            <span className="cp-stat__label">진행 중인 채용공고</span>
          </div>
          <div className="cp-stat-card">
            <span className="cp-stat__value">{completeness}%</span>
            <span className="cp-stat__label">프로필 완성도</span>
          </div>
          <div className="cp-stat-card">
            <span className="cp-stat__value">{form.stacks.length}개</span>
            <span className="cp-stat__label">등록 기술 스택</span>
          </div>
        </div>
      </div>
    </div>
  );
}
