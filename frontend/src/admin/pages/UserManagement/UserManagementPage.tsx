import { useState } from 'react';
import { Building2, CheckCircle, Clock, UserPlus, UserX, Users, XCircle } from 'lucide-react';
import '../../styles/admin.css';

type MemberTab = 'user' | 'company';

// ── 개인 회원 ────────────────────────────────────────────────
const WARN_THRESHOLD = 3; // 경고 N회 누적 시 활동정지 권고

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'ROLE_USER' | 'ROLE_COMPANY';
  plan: 'FREE' | 'PREMIUM';
  joinedAt: string;
  lastLogin: string;
  status: MemberStatus;
  warningCount: number;
  reportCount: number;
}

const dummyMembers: Member[] = [
  { id: 'U-1001', name: '김민지', email: 'minji@email.com',   role: 'ROLE_USER',    plan: 'PREMIUM', joinedAt: '2026.05.02', lastLogin: '2026.05.21', status: 'ACTIVE',    warningCount: 0, reportCount: 0 },
  { id: 'U-1002', name: '이준호', email: 'junho@email.com',   role: 'ROLE_USER',    plan: 'FREE',    joinedAt: '2026.05.01', lastLogin: '2026.05.20', status: 'ACTIVE',    warningCount: 2, reportCount: 5 },
  { id: 'U-1003', name: '박서연', email: 'seoyeon@email.com', role: 'ROLE_USER',    plan: 'FREE',    joinedAt: '2026.04.28', lastLogin: '2026.05.18', status: 'SUSPENDED', warningCount: 3, reportCount: 7 },
  { id: 'U-1004', name: '최도윤', email: 'doyoon@email.com',  role: 'ROLE_COMPANY', plan: 'PREMIUM', joinedAt: '2026.04.20', lastLogin: '2026.05.21', status: 'ACTIVE',    warningCount: 1, reportCount: 2 },
  { id: 'U-1005', name: '강하늘', email: 'haneul@email.com',  role: 'ROLE_USER',    plan: 'FREE',    joinedAt: '2026.04.15', lastLogin: '2026.05.19', status: 'ACTIVE',    warningCount: 0, reportCount: 0 },
  { id: 'U-1006', name: '윤지수', email: 'jisoo@email.com',   role: 'ROLE_USER',    plan: 'PREMIUM', joinedAt: '2026.04.10', lastLogin: '2026.05.22', status: 'BANNED',    warningCount: 3, reportCount: 8 },
];

// ── 기업 회원 (HR 담당자 승인 기반) ──────────────────────────
type ApprovalStatus = '승인 대기' | '승인 완료' | '반려';

interface CompanyMember {
  id: string;               // 회원 ID
  hrName: string;           // HR 담당자명
  email: string;
  companyName: string;      // 기업명
  bizNumber: string;        // 사업자등록번호 (certificate_number)
  permissionLevel: 'FULL' | 'NOTICE' | 'VIEWER';  // hr_managers.permission_level
  certFile: string;         // 재직증명서 파일명 (documents 테이블 연동 예정)
  joinedAt: string;
  approvedAt: string | null;
  approvalStatus: ApprovalStatus;
  rejectReason?: string;
}

const dummyCompanies: CompanyMember[] = [
  {
    id: 'C-001',
    hrName: '이상훈',
    email: 'hr.lee@techstart.com',
    companyName: '(주)테크스타트',
    bizNumber: '123-45-67890',
    permissionLevel: 'FULL',
    certFile: '재직증명서_이상훈_20260501.pdf',
    joinedAt: '2026.05.01',
    approvedAt: '2026.05.03',
    approvalStatus: '승인 완료',
  },
  {
    id: 'C-002',
    hrName: '김채원',
    email: 'recruit@neosoft.kr',
    companyName: '네오소프트',
    bizNumber: '234-56-78901',
    permissionLevel: 'FULL',
    certFile: '재직증명서_김채원_20260510.pdf',
    joinedAt: '2026.05.10',
    approvedAt: null,
    approvalStatus: '승인 대기',
  },
  {
    id: 'C-003',
    hrName: '박준영',
    email: 'team@ilab.io',
    companyName: '이노베이션랩',
    bizNumber: '345-67-89012',
    permissionLevel: 'FULL',
    certFile: '재직증명서_박준영_20260512.pdf',
    joinedAt: '2026.05.12',
    approvedAt: null,
    approvalStatus: '승인 대기',
  },
  {
    id: 'C-004',
    hrName: '최수진',
    email: 'hr@digitalp.com',
    companyName: '디지털파트너스',
    bizNumber: '456-78-90123',
    permissionLevel: 'NOTICE',
    certFile: '재직증명서_최수진_20260415.pdf',
    joinedAt: '2026.04.15',
    approvedAt: null,
    approvalStatus: '반려',
    rejectReason: '제출 서류 유효기간 만료 (3개월 이내 발급 서류 재제출 필요)',
  },
];

type MemberStatus   = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
type SuspendDuration = 'THREE_DAYS' | 'SEVEN_DAYS' | 'THIRTY_DAYS' | 'PERMANENT';

const SUSPEND_PERIODS: SuspendDuration[] = ['THREE_DAYS', 'SEVEN_DAYS', 'THIRTY_DAYS', 'PERMANENT'];
const durationLabel: Record<SuspendDuration, string> = {
  THREE_DAYS: '3일', SEVEN_DAYS: '7일', THIRTY_DAYS: '30일', PERMANENT: '영구',
};
const memberStatusLabel: Record<MemberStatus, string> = {
  ACTIVE: '정상', SUSPENDED: '정지', BANNED: '영구정지',
};
const memberStatusCls: Record<MemberStatus, string> = {
  ACTIVE: 'normal', SUSPENDED: 'blinded', BANNED: 'dismissed',
};

const approvalBadgeCls: Record<ApprovalStatus, string> = {
  '승인 대기': 'pending',
  '승인 완료': 'normal',
  '반려':      'blinded',
};

function getStatusBadgeCls(status: string): string {
  if (status === '정상')          return 'normal';
  if (status.includes('정지'))    return 'blinded';
  if (status === '탈퇴')          return 'dismissed';
  return 'pending';
}
void getStatusBadgeCls;

export default function UserManagementPage() {
  const [tab, setTab] = useState<MemberTab>('user');

  // 개인 회원 상태
  const [selectedMember, setSelectedMember]   = useState<Member | null>(null);
  const [suspendTarget, setSuspendTarget]      = useState<Member | null>(null);
  const [suspendPeriod, setSuspendPeriod]      = useState<SuspendDuration>('SEVEN_DAYS');
  const [suspendReason, setSuspendReason]      = useState('');
  const [checkedIds, setCheckedIds]            = useState<string[]>([]);
  const [userKeyword, setUserKeyword]          = useState('');

  // 기업 회원 상태
  const [selectedCompany, setSelectedCompany]   = useState<CompanyMember | null>(null);
  const [approveTarget, setApproveTarget]       = useState<CompanyMember | null>(null);
  const [rejectTarget, setRejectTarget]         = useState<CompanyMember | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [companyKeyword, setCompanyKeyword]     = useState('');
  const [companyStatusFilter, setCompanyStatusFilter] = useState('전체');

  const filteredUsers = dummyMembers.filter(
    (m) => m.name.includes(userKeyword) || m.email.includes(userKeyword) || m.id.includes(userKeyword),
  );

  const filteredCompanies = dummyCompanies.filter((c) => {
    const matchKeyword =
      c.hrName.includes(companyKeyword) ||
      c.companyName.includes(companyKeyword) ||
      c.email.includes(companyKeyword) ||
      c.id.includes(companyKeyword);
    const matchStatus =
      companyStatusFilter === '전체' || c.approvalStatus === companyStatusFilter;
    return matchKeyword && matchStatus;
  });

  const pendingCount  = dummyCompanies.filter((c) => c.approvalStatus === '승인 대기').length;
  const approvedCount = dummyCompanies.filter((c) => c.approvalStatus === '승인 완료').length;
  const rejectedCount = dummyCompanies.filter((c) => c.approvalStatus === '반려').length;

  const toggleAll = (checked: boolean) =>
    setCheckedIds(checked ? filteredUsers.map((m) => m.id) : []);
  const toggleOne = (id: string, checked: boolean) =>
    setCheckedIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));

  const openSuspend = (member: Member) => {
    setSelectedMember(null);
    setSuspendTarget(member);
    setSuspendPeriod('SEVEN_DAYS');
    setSuspendReason('');
  };
  const handleSuspend = () => setSuspendTarget(null);

  const handleApprove = () => setApproveTarget(null);
  const handleReject  = () => {
    setRejectTarget(null);
    setRejectReasonInput('');
  };

  return (
    <section>
      <header className="admin-header">
        <div>
          <h2>회원관리</h2>
          <p>플랫폼 사용자 현황을 관리하고 분석합니다.</p>
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
            {pendingCount > 0 && (
              <span className="tabBadge">{pendingCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* ── 개인 회원 탭 ─────────────────────────────────── */}
      {tab === 'user' && (
        <div className="memberPage">

          <section className="memberSummaryGrid">
            <article className="memberSummaryCard kpi-blue">
              <div className="memberKpiContent">
                <p>전체 회원 수</p>
                <h3>12,482</h3>
                <span>누적 가입 회원</span>
              </div>
              <div className="memberKpiIcon kpi-blue"><Users size={26} /></div>
            </article>
            <article className="memberSummaryCard kpi-green">
              <div className="memberKpiContent">
                <p>오늘 신규 가입</p>
                <h3>124</h3>
                <span>어제 대비 +14명</span>
              </div>
              <div className="memberKpiIcon kpi-green"><UserPlus size={26} /></div>
            </article>
            <article className="memberSummaryCard kpi-purple">
              <div className="memberKpiContent">
                <p>프리미엄 구독</p>
                <h3>3,240</h3>
                <span>구독 활성 상태</span>
              </div>
              <div className="memberKpiIcon kpi-purple">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
                </svg>
              </div>
            </article>
            <article className="memberSummaryCard kpi-yellow">
              <div className="memberKpiContent">
                <p>정지 회원 수</p>
                <h3>42</h3>
                <span>제재 처리 대상</span>
              </div>
              <div className="memberKpiIcon kpi-yellow"><UserX size={26} /></div>
            </article>
          </section>

          <section className="admin-card memberFilter">
            <input
              type="text"
              placeholder="이름, 이메일, 회원 ID 검색"
              value={userKeyword}
              onChange={(e) => setUserKeyword(e.target.value)}
            />
            <select><option value="">권한 전체</option><option value="ROLE_USER">일반 회원</option><option value="ROLE_COMPANY">기업 회원</option></select>
            <select><option>구독 전체</option><option>FREE</option><option>PREMIUM</option></select>
            <select><option value="">상태 전체</option><option value="ACTIVE">정상</option><option value="SUSPENDED">정지</option><option value="BANNED">영구정지</option></select>
            <input type="date" style={{ maxWidth: 160 }} />
            <span style={{ fontSize: 13, color: '#7a8da4', fontWeight: 600 }}>~</span>
            <input type="date" style={{ maxWidth: 160 }} />
          </section>

          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>
                회원 목록
                <span className="memberTotalCount">전체 12,482명</span>
              </h3>
              <button>회원 데이터 내보내기</button>
            </div>
            <div className="tableScroll">
            <table className="memberTable">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={checkedIds.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={(e) => toggleAll(e.target.checked)}
                    />
                  </th>
                  <th>번호</th>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>로그인ID</th>
                  <th>회원유형</th>
                  <th>플랜</th>
                  <th>가입일</th>
                  <th>상태</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={checkedIds.includes(m.id)}
                        onChange={(e) => toggleOne(m.id, e.target.checked)}
                      />
                    </td>
                    <td style={{ color: '#7a8da4', fontSize: 13 }}>{m.id}</td>
                    <td><strong style={{ color: '#1a2941' }}>{m.name}</strong></td>
                    <td>{m.email}</td>
                    <td style={{ color: '#7a8da4', fontSize: 13 }}>{m.id.toLowerCase()}</td>
                    <td><span className="roleBadge">{m.role === 'ROLE_USER' ? '개인' : '기업'}</span></td>
                    <td><span className={`planBadge ${m.plan.toLowerCase()}`}>{m.plan}</span></td>
                    <td>{m.joinedAt}</td>
                    <td><span className={`statusBadge ${memberStatusCls[m.status]}`}>{memberStatusLabel[m.status]}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="tableBtn" onClick={() => setSelectedMember(m)}>상세보기</button>
                        <button className="tableBtn tableBtn--danger" onClick={() => openSuspend(m)}>정지처리</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="memberTableFooter">
              <span className="memberTableCount">표시 중: 1 - {filteredUsers.length} / 전체 12,482명</span>
              <div className="pagination">
                <button>{'<'}</button>
                <button className="activePage">1</button>
                <button>2</button>
                <button>3</button>
                <button>{'>'}</button>
              </div>
            </div>
            </div>
          </section>
        </div>
      )}

      {/* ── 기업 회원 탭 (HR 담당자 승인 기반) ─────────────── */}
      {tab === 'company' && (
        <div className="memberPage">

          {/* KPI 카드 */}
          <section className="memberSummaryGrid">
            <article className="memberSummaryCard kpi-blue">
              <div className="memberKpiContent">
                <p>전체 기업회원</p>
                <h3>{dummyCompanies.length}</h3>
                <span>가입 신청 누계</span>
              </div>
              <div className="memberKpiIcon kpi-blue"><Building2 size={26} /></div>
            </article>
            <article className="memberSummaryCard kpi-yellow">
              <div className="memberKpiContent">
                <p>승인 대기</p>
                <h3>{pendingCount}</h3>
                <span>재직증명서 검토 필요</span>
              </div>
              <div className="memberKpiIcon kpi-yellow"><Clock size={26} /></div>
            </article>
            <article className="memberSummaryCard kpi-green">
              <div className="memberKpiContent">
                <p>승인 완료</p>
                <h3>{approvedCount}</h3>
                <span>플랫폼 이용 가능</span>
              </div>
              <div className="memberKpiIcon kpi-green"><CheckCircle size={26} /></div>
            </article>
            <article className="memberSummaryCard kpi-yellow" style={{ background: 'linear-gradient(135deg, #fde8e8 0%, #fef2f2 100%)', borderColor: '#f0b8b8' }}>
              <div className="memberKpiContent">
                <p style={{ color: '#8a2020' }}>반려</p>
                <h3 style={{ color: '#5e1010' }}>{rejectedCount}</h3>
                <span style={{ color: '#9e3030' }}>서류 재제출 안내 필요</span>
              </div>
              <div className="memberKpiIcon kpi-yellow" style={{ background: 'rgba(178, 58, 58, 0.16)', color: '#8a2020' }}><XCircle size={26} /></div>
            </article>
          </section>

          {/* 필터 */}
          <section className="admin-card memberFilter">
            <input
              type="text"
              placeholder="담당자명, 기업명, 이메일 검색"
              value={companyKeyword}
              onChange={(e) => setCompanyKeyword(e.target.value)}
            />
            <select
              value={companyStatusFilter}
              onChange={(e) => setCompanyStatusFilter(e.target.value)}
            >
              <option>전체</option>
              <option>승인 대기</option>
              <option>승인 완료</option>
              <option>반려</option>
            </select>
            <select>
              <option>가입일 (전체)</option>
              <option>오늘</option>
              <option>이번 주</option>
              <option>이번 달</option>
            </select>
            <button className="memberFilterBtn">검색</button>
          </section>

          {/* 테이블 */}
          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>
                기업회원 가입 신청 목록
                <span className="memberTotalCount">전체 {dummyCompanies.length}건</span>
              </h3>
              <button>데이터 내보내기</button>
            </div>
            <div className="tableScroll">
            <table className="memberTable">
              <thead>
                <tr>
                  <th>회원 ID</th>
                  <th>HR 담당자명</th>
                  <th>이메일</th>
                  <th>기업명</th>
                  <th>사업자등록번호</th>
                  <th>재직증명서</th>
                  <th>가입일</th>
                  <th>승인 상태</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: '#7a8da4', fontSize: 13 }}>{c.id}</td>
                    <td><strong style={{ color: '#1a2941' }}>{c.hrName}</strong></td>
                    <td>{c.email}</td>
                    <td>{c.companyName}</td>
                    <td style={{ color: '#7a8da4', fontSize: 13 }}>{c.bizNumber}</td>
                    <td>
                      <span className="certFileLink" title={c.certFile}>
                        📄 {c.certFile.length > 18 ? c.certFile.slice(0, 18) + '…' : c.certFile}
                      </span>
                    </td>
                    <td>{c.joinedAt}</td>
                    <td>
                      <span className={`statusBadge ${approvalBadgeCls[c.approvalStatus]}`}>
                        {c.approvalStatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="tableBtn" onClick={() => setSelectedCompany(c)}>상세보기</button>
                        {c.approvalStatus === '승인 대기' && (
                          <button className="tableBtn tableBtn--approve" onClick={() => setApproveTarget(c)}>승인</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="memberTableFooter">
              <span className="memberTableCount">표시 중: 1 - {filteredCompanies.length} / 전체 {dummyCompanies.length}건</span>
              <div className="pagination">
                <button>{'<'}</button>
                <button className="activePage">1</button>
                <button>{'>'}</button>
              </div>
            </div>
            </div>
          </section>
        </div>
      )}

      {/* ── 개인 회원 상세 모달 ──────────────────────────── */}
      {selectedMember && (
        <div className="modalOverlay" onClick={() => setSelectedMember(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <h3>{selectedMember.name} 상세 정보</h3>
                <p>{selectedMember.id} · {selectedMember.email}</p>
              </div>
              <button onClick={() => setSelectedMember(null)}>닫기</button>
            </div>
            <div className="modalInfoGrid">
              <div><span>권한</span><strong>{selectedMember.role === 'ROLE_USER' ? '개인 회원' : '기업 회원'}</strong></div>
              <div><span>구독 플랜</span><strong>{selectedMember.plan}</strong></div>
              <div><span>가입일</span><strong>{selectedMember.joinedAt}</strong></div>
              <div><span>최근 접속</span><strong>{selectedMember.lastLogin}</strong></div>
              <div><span>현재 상태</span><strong><span className={`statusBadge ${memberStatusCls[selectedMember.status]}`}>{memberStatusLabel[selectedMember.status]}</span></strong></div>
              <div><span>신고 받은 횟수</span><strong>{selectedMember.reportCount}건</strong></div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span>경고 횟수</span>
                <div className="warnCountWrap">
                  <div className="warnDots">
                    {Array.from({ length: WARN_THRESHOLD }).map((_, i) => (
                      <span key={i} className={`warnDot ${i < selectedMember.warningCount ? 'filled' : ''}`} />
                    ))}
                  </div>
                  <strong className={`warnCountText ${
                    selectedMember.warningCount >= WARN_THRESHOLD ? 'danger' :
                    selectedMember.warningCount === WARN_THRESHOLD - 1 ? 'caution' : ''
                  }`}>
                    {selectedMember.warningCount}/{WARN_THRESHOLD}회
                  </strong>
                  {selectedMember.warningCount >= WARN_THRESHOLD && (
                    <span className="warnAlert">활동정지 권고</span>
                  )}
                  {selectedMember.warningCount === WARN_THRESHOLD - 1 && (
                    <span className="warnCaution">1회 추가 시 활동정지 권고</span>
                  )}
                </div>
              </div>
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
              <div>
                <h3>활동 정지 처리</h3>
                <p>{suspendTarget.name} · {suspendTarget.id}</p>
              </div>
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
                      {durationLabel[p]}
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
                style={suspendPeriod === 'PERMANENT' ? { background: '#9a6767', color: 'white', borderColor: '#9a6767' } : {}}
              >
                {durationLabel[suspendPeriod]} 정지 처리
              </button>
              <button onClick={() => setSuspendTarget(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 기업 회원 상세 모달 ───────────────────────────── */}
      {selectedCompany && (
        <div className="modalOverlay" onClick={() => setSelectedCompany(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
            <div className="modalHeader">
              <div>
                <h3>{selectedCompany.companyName} HR 담당자</h3>
                <p>{selectedCompany.id} · {selectedCompany.email}</p>
              </div>
              <button onClick={() => setSelectedCompany(null)}>닫기</button>
            </div>
            <div className="modalInfoGrid">
              <div><span>HR 담당자명</span><strong>{selectedCompany.hrName}</strong></div>
              <div><span>이메일</span><strong>{selectedCompany.email}</strong></div>
              <div><span>기업명</span><strong>{selectedCompany.companyName}</strong></div>
              <div><span>사업자등록번호</span><strong>{selectedCompany.bizNumber}</strong></div>
              <div><span>가입일</span><strong>{selectedCompany.joinedAt}</strong></div>
              <div>
                <span>승인 상태</span>
                <strong>
                  <span className={`statusBadge ${approvalBadgeCls[selectedCompany.approvalStatus]}`}>
                    {selectedCompany.approvalStatus}
                  </span>
                </strong>
              </div>
            </div>

            {/* 재직증명서 */}
            <div style={{ margin: '16px 0 0', padding: '14px 16px', borderRadius: 12, background: '#f3f7fc', border: '1px solid #d8e8f5' }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#31475f' }}>재직증명서</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#4a7299' }}>📄 {selectedCompany.certFile}</span>
                <button className="tableBtn" style={{ marginLeft: 'auto' }}>파일 확인</button>
              </div>
            </div>

            {/* 반려 사유 (있을 경우) */}
            {selectedCompany.rejectReason && (
              <div style={{ margin: '12px 0 0', padding: '12px 14px', borderRadius: 10, background: '#fff5f5', border: '1px solid #ffd5d5', fontSize: 13, color: '#9a4444' }}>
                <strong>반려 사유:</strong> {selectedCompany.rejectReason}
              </div>
            )}

            <div className="modalAction">
              {selectedCompany.approvalStatus === '승인 대기' && (
                <>
                  <button
                    style={{ background: '#24496f', color: 'white', borderColor: '#24496f' }}
                    onClick={() => { setSelectedCompany(null); setApproveTarget(selectedCompany); }}
                  >
                    승인 처리
                  </button>
                  <button
                    style={{ background: '#fff1f2', color: '#9a6767', borderColor: '#ffd5d5' }}
                    onClick={() => { setSelectedCompany(null); setRejectTarget(selectedCompany); }}
                  >
                    반려 처리
                  </button>
                </>
              )}
              <button onClick={() => setSelectedCompany(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 승인 확인 모달 ────────────────────────────────── */}
      {approveTarget && (
        <div className="modalOverlay" onClick={() => setApproveTarget(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 460 }}>
            <div className="modalHeader">
              <div>
                <h3>기업회원 승인 처리</h3>
                <p>{approveTarget.hrName} · {approveTarget.companyName}</p>
              </div>
              <button onClick={() => setApproveTarget(null)}>닫기</button>
            </div>
            <div style={{ padding: '16px', borderRadius: 12, background: '#f0f8f4', border: '1px solid #b8dece', fontSize: 14, color: '#2c6e4f', lineHeight: 1.7 }}>
              <strong>{approveTarget.hrName}</strong> 담당자의 재직증명서를 확인하고<br />
              <strong>{approveTarget.companyName}</strong> 기업회원 가입을 <strong>승인</strong>합니다.<br />
              승인 후 해당 계정은 즉시 플랫폼을 이용할 수 있습니다.
            </div>
            <div style={{ margin: '12px 0 0', padding: '12px 14px', borderRadius: 10, background: '#f6f9fc', border: '1px solid #dbe5ee', fontSize: 13, color: '#5f7388' }}>
              처리 관리자 ID: <strong style={{ color: '#24496f' }}>cs_admin_01</strong>
            </div>
            <div className="modalAction">
              <button
                style={{ background: '#24496f', color: 'white', borderColor: '#24496f' }}
                onClick={handleApprove}
              >
                승인 확정
              </button>
              <button onClick={() => setApproveTarget(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 반려 처리 모달 ────────────────────────────────── */}
      {rejectTarget && (
        <div className="modalOverlay" onClick={() => setRejectTarget(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
            <div className="modalHeader">
              <div>
                <h3>기업회원 반려 처리</h3>
                <p>{rejectTarget.hrName} · {rejectTarget.companyName}</p>
              </div>
              <button onClick={() => setRejectTarget(null)}>닫기</button>
            </div>
            <div className="csFormRows">
              <div className="csFormRow">
                <label>반려 사유 <span style={{ color: '#9a6767', fontSize: 12 }}>* 신청자에게 안내됩니다</span></label>
                <textarea
                  className="csFormTextarea"
                  placeholder="예) 재직증명서 유효기간 만료 — 3개월 이내 발급 서류로 재제출 해주세요."
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  style={{ minHeight: 90 }}
                />
              </div>
              <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f6f9fc', border: '1px solid #dbe5ee', fontSize: 13, color: '#5f7388' }}>
                처리 관리자 ID: <strong style={{ color: '#24496f' }}>cs_admin_01</strong>
              </div>
            </div>
            <div className="modalAction">
              <button
                style={{ background: '#9a6767', color: 'white', borderColor: '#9a6767' }}
                onClick={handleReject}
              >
                반려 처리
              </button>
              <button onClick={() => setRejectTarget(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
