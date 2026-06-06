import { useState } from 'react';
import { Search, CheckCircle2, XCircle, Clock, FileText, MessageSquare, ChevronDown } from 'lucide-react';
import './styles/ApplicantManagementPage.css';

const STAGES = ['전체', '서류 검토', '서류 합격', '면접 대기', '최종 결과'];

const MOCK_APPLICANTS = [
  { id: 1, name: '김민준', job: '백엔드 개발자', appliedAt: '2025-05-10', stage: '서류 검토', exp: '3년',  stacks: ['Java','Spring','AWS'],  score: 88 },
  { id: 2, name: '이지은', job: '백엔드 개발자', appliedAt: '2025-05-11', stage: '서류 합격', exp: '5년',  stacks: ['Python','Django','GCP'], score: 91 },
  { id: 3, name: '박서준', job: '프론트엔드',    appliedAt: '2025-05-12', stage: '면접 대기', exp: '2년',  stacks: ['React','TypeScript'],    score: 75 },
  { id: 4, name: '최수연', job: '백엔드 개발자', appliedAt: '2025-05-13', stage: '서류 검토', exp: '신입', stacks: ['Java','Spring'],          score: 70 },
  { id: 5, name: '정하은', job: '프론트엔드',    appliedAt: '2025-05-14', stage: '최종 결과', exp: '4년',  stacks: ['Vue','Nuxt','Node.js'],   score: 85 },
];

const STAGE_META = {
  '서류 검토': { color: '#60a5fa', bg: '#dbeafe' },
  '서류 합격': { color: '#22c55e', bg: '#dcfce7' },
  '면접 대기': { color: '#f59e0b', bg: '#fef3c7' },
  '최종 결과': { color: '#a78bfa', bg: '#ede9fe' },
};

export default function ApplicantManagementPage() {
  const [search,      setSearch]      = useState('');
  const [stageFilter, setStageFilter] = useState('전체');
  const [stages,      setStages]      = useState(
    Object.fromEntries(MOCK_APPLICANTS.map(a => [a.id, a.stage]))
  );

  function updateStage(id, stage) { setStages(s => ({ ...s, [id]: stage })); }

  const filtered = MOCK_APPLICANTS.filter(a => {
    if (search && !a.name.includes(search) && !a.job.includes(search)) return false;
    if (stageFilter !== '전체' && stages[a.id] !== stageFilter) return false;
    return true;
  });

  return (
    <div className="am-page">
      <div className="am-header">
        <span className="am-eyebrow">APPLICANT MANAGEMENT</span>
        <h1 className="am-header__title">지원자 관리</h1>
        <p className="am-header__desc">접수된 지원자의 이력서를 검토하고 전형 단계를 업데이트합니다.</p>
      </div>

      {/* 필터 바 */}
      <div className="am-toolbar">
        <div className="am-search">
          <Search size={15} />
          <input placeholder="이름, 직무 검색" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="am-stage-filters">
          {STAGES.map(s => (
            <button key={s} className={`am-stage-chip${stageFilter === s ? ' am-stage-chip--on' : ''}`} onClick={() => setStageFilter(s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* 지원자 테이블 */}
      <div className="am-card">
        <div className="am-table-wrap">
          <table className="am-table">
            <thead>
              <tr>
                <th>이름</th><th>직무</th><th>경력</th><th>기술 스택</th>
                <th>AI 면접 점수</th><th>지원일</th><th>전형 단계</th><th>액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => {
                const stage = stages[a.id];
                const meta  = STAGE_META[stage];
                return (
                  <tr key={a.id}>
                    <td className="am-table__name">{a.name}</td>
                    <td>{a.job}</td>
                    <td>{a.exp}</td>
                    <td>
                      <div className="am-stacks">
                        {a.stacks.map(s => <span key={s} className="am-stack">{s}</span>)}
                      </div>
                    </td>
                    <td>
                      <span className={`am-score${a.score >= 85 ? ' am-score--high' : a.score >= 70 ? ' am-score--mid' : ' am-score--low'}`}>
                        {a.score}점
                      </span>
                    </td>
                    <td className="am-table__date">{a.appliedAt}</td>
                    <td>
                      <div className="am-stage-select-wrap">
                        <span className="am-stage-badge" style={{ color: meta.color, background: meta.bg }}>{stage}</span>
                        <div className="am-stage-dropdown">
                          <button className="am-stage-dropdown__btn"><ChevronDown size={12} /></button>
                          <div className="am-stage-dropdown__menu">
                            {STAGES.slice(1).map(s => (
                              <button key={s} onClick={() => updateStage(a.id, s)}>{s}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="am-actions">
                        <button className="am-action-btn" title="이력서"><FileText size={13} /></button>
                        <button className="am-action-btn am-action-btn--pass" title="합격" onClick={() => updateStage(a.id, '서류 합격')}><CheckCircle2 size={13} /></button>
                        <button className="am-action-btn am-action-btn--fail" title="불합격" onClick={() => updateStage(a.id, '최종 결과')}><XCircle size={13} /></button>
                        <button className="am-action-btn" title="메시지"><MessageSquare size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
