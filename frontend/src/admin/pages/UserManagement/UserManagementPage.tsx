import { useState } from 'react';
import '../../styles/admin.css';

type MemberTab = 'user' | 'company';

// ── 개인 회원 ────────────────────────────────────────────────
interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  plan: 'FREE' | 'PREMIUM';
  joinedAt: string;
  lastLogin: string;
  status: string;
}

const dummyMembers: Member[] = [
  { id: 'U-1001', name: '김민지', email: 'minji@email.com',   role: 'ROLE_USER',   plan: 'PREMIUM', joinedAt: '2026.05.02', lastLogin: '2026.05.21', status: '정상' },
  { id: 'U-1002', name: '이준호', email: 'junho@email.com',   role: 'ROLE_MENTOR', plan: 'FREE',    joinedAt: '2026.05.01', lastLogin: '2026.05.20', status: '정상' },
  { id: 'U-1003', name: '박서연', email: 'seoyeon@email.com', role: 'ROLE_USER',   plan: 'FREE',    joinedAt: '2026.04.28', lastLogin: '2026.05.18', status: '7일 정지' },
  { id: 'U-1004', name: '최도윤', email: 'doyoon@email.com',  role: 'ROLE_USER',   plan: 'PREMIUM', joinedAt: '2026.04.20', lastLogin: '2026.05.21', status: '정상' },
];

// ── 기업 회원 ────────────────────────────────────────────────
interface Company {
  id: string;
  name: string;
  bizNumber: string;
  hrEmail: string;
  plan: 'Standard' | 'Premium';
  activeSeats: number;
  maxSeats: number;
  credits: number;
  renewAt: string;
  status: '정상' | '정지' | '해지';
}

const dummyCompanies: Company[] = [
  { id: 'C-001', name: '(주)테크스타트', bizNumber: '123-45-67890', hrEmail: 'hr@techstart.com',   plan: 'Premium',  activeSeats: 4, maxSeats: 5, credits: 280, renewAt: '2026.06.01', status: '정상' },
  { id: 'C-002', name: '네오소프트',     bizNumber: '234-56-78901', hrEmail: 'recruit@neosoft.kr', plan: 'Standard', activeSeats: 2, maxSeats: 3, credits: 50,  renewAt: '2026.06.15', status: '정상' },
  { id: 'C-003', name: '이노베이션랩',   bizNumber: '345-67-89012', hrEmail: 'team@ilab.io',       plan: 'Premium',  activeSeats: 5, maxSeats: 5, credits: 0,   renewAt: '2026.05.30', status: '정지' },
  { id: 'C-004', name: '디지털파트너스', bizNumber: '456-78-90123', hrEmail: 'hr@digitalp.com',    plan: 'Standard', activeSeats: 1, maxSeats: 3, credits: 120, renewAt: '2026.07.01', status: '정상' },
];

const SUSPEND_PERIODS = ['3일', '7일', '30일', '영구'];

const companyCls = { '정상': 'normal', '정지': 'pending', '해지': 'dismissed' } as const;

export default function UserManagementPage() {
  const [tab, setTab] = useState<MemberTab>('user');

  // 개인 회원 상태
  const [selectedMember, setSelectedMember]   = useState<Member | null>(null);
  const [suspendTarget, setSuspendTarget]      = useState<Member | null>(null);
  const [suspendPeriod, setSuspendPeriod]      = useState('7일');
  const [suspendReason, setSuspendReason]      = useState('');
  const [checkedIds, setCheckedIds]            = useState<string[]>([]);
  const [userKeyword, setUserKeyword]          = useState('');

  // 기업 회원 상태
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyKeyword, setCompanyKeyword]   = useState('');

  const filteredUsers = dummyMembers.filter(
    (m) => m.name.includes(userKeyword) || m.email.includes(userKeyword) || m.id.includes(userKeyword),
  );

  const filteredCompanies = dummyCompanies.filter(
    (c) => c.name.includes(companyKeyword) || c.bizNumber.includes(companyKeyword) || c.id.includes(companyKeyword),
  );

  const toggleAll = (checked: boolean) =>
    setCheckedIds(checked ? filteredUsers.map((m) => m.id) : []);
  const toggleOne = (id: string, checked: boolean) =>
    setCheckedIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));

  const openSuspend = (member: Member) => {
    setSelectedMember(null);
    setSuspendTarget(member);
    setSuspendPeriod('7일');
    setSuspendReason('');
  };

  const handleSuspend = () => {
    setSuspendTarget(null);
  };

  return (
    <section>
      <header className="admin-header">
        <div>
          <h2>회원 관리</h2>
          <p>가입 회원 및 권한 상태를 관리합니다.</p>
        </div>
      </header>

      {/* 탭 바 */}
      <div className="admin-card" style={{ padding: '0 22px', marginBottom: 18 }}>
        <div className="csTabBar">
          <button className={`csTab${tab === 'user' ? ' active' : ''}`} onClick={() => setTab('user')}>
            개인 회원
          </button>
          <button className={`csTab${tab === 'company' ? ' active' : ''}`} onClick={() => setTab('company')}>
            기업 회원
          </button>
        </div>
      </div>

      {/* ── 개인 회원 탭 ─────────────────────────────────── */}
      {tab === 'user' && (
        <div className="memberPage">
          <section className="memberSummaryGrid">
            <article className="memberSummaryCard">
              <p>전체 회원</p><h3>12,840</h3><span>누적 가입 회원</span>
            </article>
            <article className="memberSummaryCard">
              <p>오늘 신규 가입</p><h3>128</h3><span>어제 대비 +14명</span>
            </article>
            <article className="memberSummaryCard">
              <p>프리미엄 회원</p><h3>2,430</h3><span>구독 활성 상태</span>
            </article>
            <article className="memberSummaryCard">
              <p>정지 회원</p><h3>18</h3><span>제재 처리 대상</span>
            </article>
          </section>

          <section className="admin-card memberFilter">
            <input
              type="text"
              placeholder="이름, 이메일, 회원 ID 검색"
              value={userKeyword}
              onChange={(e) => setUserKeyword(e.target.value)}
            />
            <select><option>권한 전체</option><option>ROLE_USER</option><option>ROLE_MENTOR</option></select>
            <select><option>구독 전체</option><option>FREE</option><option>PREMIUM</option></select>
            <select><option>상태 전체</option><option>정상</option><option>3일 정지</option><option>7일 정지</option><option>영구 정지</option></select>
            <input type="date" style={{ maxWidth: 160 }} />
            <span style={{ fontSize: 13, color: '#7a8da4', fontWeight: 600 }}>~</span>
            <input type="date" style={{ maxWidth: 160 }} />
          </section>

          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>회원 목록</h3>
              <button>회원 데이터 내보내기</button>
            </div>
            <table className="memberTable">
              <thead>
                <tr>
                  <th><input type="checkbox" checked={checkedIds.length === filteredUsers.length && filteredUsers.length > 0} onChange={(e) => toggleAll(e.target.checked)} /></th>
                  <th>회원 ID</th><th>이름</th><th>이메일</th><th>권한</th>
                  <th>구독</th><th>가입일</th><th>최근 접속</th><th>상태</th><th>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((m) => (
                  <tr key={m.id}>
                    <td><input type="checkbox" checked={checkedIds.includes(m.id)} onChange={(e) => toggleOne(m.id, e.target.checked)} /></td>
                    <td>{m.id}</td>
                    <td>{m.name}</td>
                    <td>{m.email}</td>
                    <td>{m.role}</td>
                    <td><span className={`planBadge ${m.plan.toLowerCase()}`}>{m.plan}</span></td>
                    <td>{m.joinedAt}</td>
                    <td>{m.lastLogin}</td>
                    <td><span className={`statusBadge ${m.status === '정상' ? 'normal' : 'blinded'}`}>{m.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="tableBtn" onClick={() => setSelectedMember(m)}>상세보기</button>
                        <button className="tableBtn" onClick={() => openSuspend(m)}>정지</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <button>{'<'}</button>
              <button className="activePage">1</button><button>2</button><button>3</button>
              <button>{'>'}</button>
            </div>
          </section>
        </div>
      )}

      {/* ── 기업 회원 탭 ─────────────────────────────────── */}
      {tab === 'company' && (
        <div className="memberPage">
          <section className="memberSummaryGrid">
            <article className="memberSummaryCard">
              <p>전체 기업</p><h3>{dummyCompanies.length}</h3><span>가입 기업 수</span>
            </article>
            <article className="memberSummaryCard">
              <p>Premium 플랜</p><h3>{dummyCompanies.filter((c) => c.plan === 'Premium').length}</h3><span>고가 구독 기업</span>
            </article>
            <article className="memberSummaryCard">
              <p>총 활성 좌석</p><h3>{dummyCompanies.reduce((s, c) => s + c.activeSeats, 0)}</h3><span>전체 사용 중</span>
            </article>
            <article className="memberSummaryCard">
              <p>크레딧 잔액 합계</p><h3>{dummyCompanies.reduce((s, c) => s + c.credits, 0)}</h3><span>총 미사용 크레딧</span>
            </article>
          </section>

          <section className="admin-card memberFilter">
            <input
              type="text"
              placeholder="기업명, 사업자번호, 기업 ID 검색"
              value={companyKeyword}
              onChange={(e) => setCompanyKeyword(e.target.value)}
            />
            <select><option>플랜 전체</option><option>Standard</option><option>Premium</option></select>
            <select><option>상태 전체</option><option>정상</option><option>정지</option><option>해지</option></select>
          </section>

          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>기업 회원 목록</h3>
              <button>기업 데이터 내보내기</button>
            </div>
            <table className="memberTable">
              <thead>
                <tr>
                  <th>기업 ID</th><th>기업명</th><th>사업자번호</th><th>플랜</th>
                  <th>좌석 현황</th><th>크레딧 잔액</th><th>갱신일</th><th>상태</th><th>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.bizNumber}</td>
                    <td><span className={`planBadge ${c.plan === 'Premium' ? 'premium' : 'free'}`}>{c.plan}</span></td>
                    <td>
                      <div className="seatBar">
                        <div className="seatProgress">
                          <div style={{ width: `${(c.activeSeats / c.maxSeats) * 100}%` }} />
                        </div>
                        <span>{c.activeSeats}/{c.maxSeats}</span>
                      </div>
                    </td>
                    <td>{c.credits.toLocaleString()} 크레딧</td>
                    <td>{c.renewAt}</td>
                    <td><span className={`statusBadge ${companyCls[c.status]}`}>{c.status}</span></td>
                    <td><button className="tableBtn" onClick={() => setSelectedCompany(c)}>상세보기</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <button>{'<'}</button><button className="activePage">1</button><button>{'>'}</button>
            </div>
          </section>
        </div>
      )}

      {/* ── 개인 회원 상세 모달 ──────────────────────────── */}
      {selectedMember && (
        <div className="modalOverlay" onClick={() => setSelectedMember(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div><h3>{selectedMember.name} 상세 정보</h3><p>{selectedMember.id} · {selectedMember.email}</p></div>
              <button onClick={() => setSelectedMember(null)}>닫기</button>
            </div>
            <div className="modalInfoGrid">
              <div><span>권한</span><strong>{selectedMember.role}</strong></div>
              <div><span>구독 상태</span><strong>{selectedMember.plan}</strong></div>
              <div><span>가입일</span><strong>{selectedMember.joinedAt}</strong></div>
              <div><span>최근 접속</span><strong>{selectedMember.lastLogin}</strong></div>
              <div><span>현재 상태</span><strong>{selectedMember.status}</strong></div>
              <div><span>신고 받은 횟수</span><strong>0건</strong></div>
            </div>
            <div className="modalAction">
              <button onClick={() => openSuspend(selectedMember)}>활동 정지</button>
              <button onClick={() => setSelectedMember(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 활동 정지 모달 ────────────────────────────────── */}
      {suspendTarget && (
        <div className="modalOverlay" onClick={() => setSuspendTarget(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div><h3>활동 정지 처리</h3><p>{suspendTarget.name} · {suspendTarget.id}</p></div>
              <button onClick={() => setSuspendTarget(null)}>닫기</button>
            </div>
            <div className="csFormRows">
              <div className="csFormRow">
                <label>정지 기간</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {SUSPEND_PERIODS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setSuspendPeriod(p)}
                      style={{
                        height: 38, padding: '0 16px', borderRadius: 8, fontFamily: 'inherit',
                        border: `1px solid ${suspendPeriod === p ? '#24496f' : '#d7e4f2'}`,
                        background: suspendPeriod === p ? '#24496f' : 'white',
                        color: suspendPeriod === p ? 'white' : '#24496f',
                        fontWeight: 600, fontSize: 14, cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="csFormRow">
                <label>정지 사유</label>
                <textarea
                  className="csFormTextarea"
                  placeholder="이용 약관 위반 내용을 입력하세요"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  style={{ minHeight: 80 }}
                />
              </div>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f6f9fc', border: '1px solid #dbe5ee', fontSize: 13, color: '#5f7388' }}>
                처리 관리자 ID: <strong style={{ color: '#24496f' }}>cs_admin_01</strong>
              </div>
            </div>
            <div className="modalAction">
              <button
                onClick={handleSuspend}
                style={suspendPeriod === '영구' ? { background: '#9a6767', color: 'white', borderColor: '#9a6767' } : {}}
              >
                {suspendPeriod} 정지 처리
              </button>
              <button onClick={() => setSuspendTarget(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 기업 상세 모달 ────────────────────────────────── */}
      {selectedCompany && (
        <div className="modalOverlay" onClick={() => setSelectedCompany(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
            <div className="modalHeader">
              <div><h3>{selectedCompany.name}</h3><p>{selectedCompany.id} · {selectedCompany.bizNumber}</p></div>
              <button onClick={() => setSelectedCompany(null)}>닫기</button>
            </div>
            <div className="modalInfoGrid">
              <div><span>구독 플랜</span><strong>{selectedCompany.plan}</strong></div>
              <div><span>HR 이메일</span><strong>{selectedCompany.hrEmail}</strong></div>
              <div><span>좌석 현황</span><strong>{selectedCompany.activeSeats} / {selectedCompany.maxSeats} 석</strong></div>
              <div><span>크레딧 잔액</span><strong>{selectedCompany.credits.toLocaleString()} 크레딧</strong></div>
              <div><span>갱신일</span><strong>{selectedCompany.renewAt}</strong></div>
              <div><span>현재 상태</span><strong>{selectedCompany.status}</strong></div>
            </div>
            <div className="modalAction">
              <button>플랜 변경</button>
              <button>좌석 조정</button>
              <button onClick={() => setSelectedCompany(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
