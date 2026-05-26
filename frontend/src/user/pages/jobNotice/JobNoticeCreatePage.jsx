import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, ChevronLeft, Send } from 'lucide-react';
import './styles/JobNoticeCreatePage.css';

const JOB_TYPES  = ['백엔드', '프론트엔드', '풀스택', '데이터 엔지니어', 'DevOps', 'iOS', 'Android', 'AI/ML'];
const EXP_OPTIONS = ['신입', '1년 이상', '3년 이상', '5년 이상', '경력 무관'];
const STACK_PRESETS = ['Java', 'Spring Boot', 'Python', 'React', 'Vue', 'Node.js', 'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MySQL', 'Redis', 'Kafka', 'TypeScript'];

export default function JobNoticeCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', jobType: '', exp: '', deadline: '',
    duties: '', required: '', preferred: '', benefits: '',
  });
  const [stacks, setStacks]     = useState([]);
  const [stackInput, setStackInput] = useState('');

  function update(field, val) { setForm(f => ({ ...f, [field]: val })); }

  function addStack(s) {
    const val = s.trim();
    if (val && !stacks.includes(val)) setStacks(prev => [...prev, val]);
    setStackInput('');
  }

  function removeStack(s) { setStacks(prev => prev.filter(v => v !== s)); }

  const canSubmit = form.title && form.jobType && form.exp && form.deadline && form.duties && form.required && stacks.length > 0;

  return (
    <div className="jc">
      <div className="jc-wrap">
        <button className="jc-back" onClick={() => navigate('/jobs')}>
          <ChevronLeft size={16} /> 공고 목록
        </button>
        <div className="jc-header">
          <span className="jc-eyebrow">JOB NOTICE</span>
          <h1 className="jc-header__title">채용 공고 등록</h1>
          <p className="jc-header__desc">공고 정보를 입력하면 AI가 기술 스택을 자동 태깅하고 노출 최적화를 도와드립니다.</p>
        </div>

        <div className="jc-form">
          {/* 공고명 */}
          <div className="jc-field">
            <label className="jc-field__label">공고 제목 <span>*</span></label>
            <input className="jc-input" placeholder="ex) 백엔드 개발자 (결제 서버)" value={form.title} onChange={e => update('title', e.target.value)} />
          </div>

          {/* 직무 + 경력 */}
          <div className="jc-row">
            <div className="jc-field">
              <label className="jc-field__label">모집 직무 <span>*</span></label>
              <div className="jc-chips">
                {JOB_TYPES.map(j => (
                  <button key={j} type="button" className={`jc-chip${form.jobType === j ? ' jc-chip--on' : ''}`} onClick={() => update('jobType', j)}>{j}</button>
                ))}
              </div>
            </div>
            <div className="jc-field">
              <label className="jc-field__label">경력 조건 <span>*</span></label>
              <div className="jc-chips">
                {EXP_OPTIONS.map(e => (
                  <button key={e} type="button" className={`jc-chip${form.exp === e ? ' jc-chip--on' : ''}`} onClick={() => update('exp', e)}>{e}</button>
                ))}
              </div>
            </div>
          </div>

          {/* 마감일 */}
          <div className="jc-field jc-field--half">
            <label className="jc-field__label">접수 마감일 <span>*</span></label>
            <input className="jc-input" type="date" value={form.deadline} onChange={e => update('deadline', e.target.value)} />
          </div>

          {/* 기술 스택 */}
          <div className="jc-field">
            <label className="jc-field__label">기술 스택 <span>*</span></label>
            <div className="jc-stack-presets">
              {STACK_PRESETS.map(s => (
                <button key={s} type="button" className={`jc-preset${stacks.includes(s) ? ' jc-preset--on' : ''}`}
                  onClick={() => stacks.includes(s) ? removeStack(s) : addStack(s)}>{s}</button>
              ))}
            </div>
            <div className="jc-stack-input-wrap">
              <input
                className="jc-input"
                placeholder="직접 입력 후 Enter"
                value={stackInput}
                onChange={e => setStackInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStack(stackInput))}
              />
              <button type="button" className="jc-stack-add" onClick={() => addStack(stackInput)}><Plus size={14} /></button>
            </div>
            {stacks.length > 0 && (
              <div className="jc-selected-stacks">
                {stacks.map(s => (
                  <span key={s} className="jc-selected-stack">
                    {s} <button type="button" onClick={() => removeStack(s)}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 담당 업무 */}
          <div className="jc-field">
            <label className="jc-field__label">담당 업무 <span>*</span></label>
            <textarea className="jc-textarea" rows={4} placeholder="- 핵심 서비스 백엔드 API 개발&#10;- 대용량 트래픽 처리 최적화" value={form.duties} onChange={e => update('duties', e.target.value)} />
          </div>

          {/* 자격 요건 */}
          <div className="jc-field">
            <label className="jc-field__label">자격 요건 <span>*</span></label>
            <textarea className="jc-textarea" rows={4} placeholder="- Java/Spring 3년 이상&#10;- REST API 설계 경험" value={form.required} onChange={e => update('required', e.target.value)} />
          </div>

          {/* 우대 사항 */}
          <div className="jc-field">
            <label className="jc-field__label">우대 사항</label>
            <textarea className="jc-textarea" rows={3} placeholder="- AWS 실무 경험&#10;- MSA 설계 경험" value={form.preferred} onChange={e => update('preferred', e.target.value)} />
          </div>

          {/* 복지 */}
          <div className="jc-field">
            <label className="jc-field__label">복지 혜택</label>
            <input className="jc-input" placeholder="ex) 유연근무, 재택근무, 식비 지원" value={form.benefits} onChange={e => update('benefits', e.target.value)} />
          </div>

          <div className="jc-actions">
            <button type="button" className="jc-btn jc-btn--outline" onClick={() => navigate('/jobs')}>취소</button>
            <button type="button" className="jc-btn jc-btn--primary" disabled={!canSubmit} onClick={() => navigate('/jobs')}>
              <Send size={14} /> 공고 등록하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
