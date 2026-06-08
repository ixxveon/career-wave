import { useState } from 'react';
import { UserPlus, ShieldCheck, Trash2, MoreHorizontal, Mail, Clock } from 'lucide-react';
import './styles/HrManagerPage.css';

const ROLES = ['공고 관리', '지원자 열람', '결제/정산', '전체 관리자'];

const ROLE_META = {
  '공고 관리':   { color: '#3b82f6', bg: '#dbeafe' },
  '지원자 열람': { color: '#22c55e', bg: '#dcfce7' },
  '결제/정산':   { color: '#f59e0b', bg: '#fef3c7' },
  '전체 관리자': { color: '#a78bfa', bg: '#ede9fe' },
};

const MOCK_MANAGERS = [
  { id: 1, name: '김채용', email: 'kim@careerwave.io', role: '전체 관리자', joinedAt: '2025-01-10', lastActive: '오늘', status: 'active' },
  { id: 2, name: '이담당', email: 'lee@careerwave.io', role: '공고 관리', joinedAt: '2025-03-05', lastActive: '어제', status: 'active' },
  { id: 3, name: '박인사', email: 'park@careerwave.io', role: '지원자 열람', joinedAt: '2025-03-15', lastActive: '3일 전', status: 'active' },
  { id: 4, name: '최정산', email: 'choi@careerwave.io', role: '결제/정산', joinedAt: '2025-04-01', lastActive: '1주일 전', status: 'invited' },
];

const ACTIVITY_LOG = [
  { id: 1, actor: '김채용', action: '지원자 박서준 전형 단계 변경', time: '10분 전' },
  { id: 2, actor: '이담당', action: '백엔드 개발자 공고 등록', time: '2시간 전' },
  { id: 3, actor: '박인사', action: '이지은 이력서 열람', time: '어제 16:30' },
  { id: 4, actor: '김채용', action: '이달 정산 보고서 다운로드', time: '어제 10:05' },
  { id: 5, actor: '이담당', action: '프론트엔드 공고 마감 처리', time: '3일 전' },
];

export default function HrManagerPage() {
  const [managers,    setManagers]    = useState(MOCK_MANAGERS);
  const [showInvite,  setShowInvite]  = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole,  setInviteRole]  = useState('공고 관리');

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    setManagers(ms => [...ms, {
      id: Date.now(), name: inviteEmail.split('@')[0], email: inviteEmail.trim(),
      role: inviteRole, joinedAt: '방금', lastActive: '-', status: 'invited',
    }]);
    setInviteEmail('');
    setShowInvite(false);
  }

  function removeManager(id) {
    setManagers(ms => ms.filter(m => m.id !== id));
  }

  return (
    <div className="hr-page">
      <div className="hr-header">
        <span className="hr-eyebrow">HR MANAGER</span>
        <h1 className="hr-header__title">HR 담당자 관리</h1>
        <p className="hr-header__desc">채용 업무를 함께 진행할 담당자를 초대하고 역할과 접근 권한을 설정합니다.</p>
      </div>

      {/* 요약 통계 */}
      <div className="hr-stats">
        <div className="hr-stat">
          <span className="hr-stat__value">{managers.length}</span>
          <span className="hr-stat__label">등록 담당자</span>
        </div>
        <div className="hr-stat">
          <span className="hr-stat__value">{managers.filter(m => m.status === 'active').length}</span>
          <span className="hr-stat__label">활성 담당자</span>
        </div>
        <div className="hr-stat">
          <span className="hr-stat__value">{managers.filter(m => m.status === 'invited').length}</span>
          <span className="hr-stat__label">초대 대기</span>
        </div>
        <div className="hr-stat">
          <span className="hr-stat__value">{ROLES.length}</span>
          <span className="hr-stat__label">권한 종류</span>
        </div>
      </div>

      {/* 담당자 목록 */}
      <div className="hr-card">
        <div className="hr-card__header">
          <p className="hr-card__title"><ShieldCheck size={15} /> 담당자 목록</p>
          <button className="hr-invite-btn" onClick={() => setShowInvite(v => !v)}>
            <UserPlus size={14} /> 담당자 초대
          </button>
        </div>

        {/* 초대 폼 */}
        {showInvite && (
          <div className="hr-invite-form">
            <div className="hr-invite-form__fields">
              <input
                className="hr-input" type="email" placeholder="이메일 주소"
                value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              />
              <select className="hr-input" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="hr-invite-form__actions">
              <button className="hr-btn hr-btn--outline" onClick={() => setShowInvite(false)}>취소</button>
              <button className="hr-btn hr-btn--primary" disabled={!inviteEmail.trim()} onClick={handleInvite}>
                <Mail size={13} /> 초대 전송
              </button>
            </div>
          </div>
        )}

        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead>
              <tr><th>이름</th><th>이메일</th><th>권한</th><th>가입일</th><th>최근 활동</th><th>상태</th><th></th></tr>
            </thead>
            <tbody>
              {managers.map(m => {
                const meta = ROLE_META[m.role];
                return (
                  <tr key={m.id}>
                    <td className="hr-table__name">{m.name}</td>
                    <td className="hr-table__email">{m.email}</td>
                    <td>
                      <span className="hr-role-badge" style={{ color: meta.color, background: meta.bg }}>{m.role}</span>
                    </td>
                    <td className="hr-table__date">{m.joinedAt}</td>
                    <td>
                      <span className="hr-last-active"><Clock size={11} /> {m.lastActive}</span>
                    </td>
                    <td>
                      <span className={`hr-status hr-status--${m.status}`}>
                        {m.status === 'active' ? '활성' : '초대 대기'}
                      </span>
                    </td>
                    <td>
                      <button className="hr-del-btn" onClick={() => removeManager(m.id)} title="삭제">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 권한 설명 */}
      <div className="hr-card">
        <p className="hr-card__title"><ShieldCheck size={15} /> 권한 종류</p>
        <div className="hr-roles">
          {Object.entries(ROLE_META).map(([role, meta]) => (
            <div key={role} className="hr-role-item">
              <span className="hr-role-badge" style={{ color: meta.color, background: meta.bg }}>{role}</span>
              <span className="hr-role-desc">
                {role === '공고 관리'   && '채용공고 등록, 수정, 마감 처리 가능'}
                {role === '지원자 열람' && '지원자 이력서 열람 및 단계 업데이트 가능'}
                {role === '결제/정산'   && '결제 수단 관리 및 정산 보고서 조회 가능'}
                {role === '전체 관리자' && '모든 기능 접근 및 담당자 관리 가능'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 활동 로그 */}
      <div className="hr-card">
        <p className="hr-card__title"><MoreHorizontal size={15} /> 최근 활동 내역</p>
        <div className="hr-log-list">
          {ACTIVITY_LOG.map(log => (
            <div key={log.id} className="hr-log">
              <div className="hr-log__avatar">{log.actor[0]}</div>
              <div className="hr-log__body">
                <span className="hr-log__actor">{log.actor}</span>
                <span className="hr-log__action">{log.action}</span>
              </div>
              <span className="hr-log__time">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
