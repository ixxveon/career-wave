import { useState, useEffect, useCallback, useRef } from 'react';
import { Building2, CheckCircle, Clock, UserPlus, UserX, Users, XCircle } from 'lucide-react';
import {
  memberApi,
  MEMBER_ROLE,
  MEMBER_STATUS,
  type MemberItem,
  type MemberDetailItem,
  type MemberStatus,
  type MemberCounts,
  type SuspendDuration,
  type HrManagerItem,
  type HrManagerDetail,
  type HrStatus,
} from '../../../api/admin/memberApi';
import { adminSession } from '../../../api/admin/adminSession';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/UserManagement.css';

type MemberTab = 'user' | 'company';

const WARN_THRESHOLD = 3;


const SUSPEND_PERIODS: SuspendDuration[] = ['THREE_DAYS', 'SEVEN_DAYS', 'THIRTY_DAYS', 'PERMANENT'];
const durationLabel: Record<SuspendDuration, string> = {
  THREE_DAYS: '3일', SEVEN_DAYS: '7일', THIRTY_DAYS: '30일', PERMANENT: '영구',
};
const memberStatusLabel: Record<MemberStatus, string> = {
  ACTIVE: '정상', SUSPENDED: '정지', BANNED: '영구정지', LOCKED: '잠금', WITHDRAWN: '탈퇴',
};
const memberStatusCls: Record<MemberStatus, string> = {
  ACTIVE: 'normal', SUSPENDED: 'blinded', BANNED: 'dismissed', LOCKED: 'pending', WITHDRAWN: 'dismissed',
};
const hrStatusLabel: Record<HrStatus, string> = {
  PENDING: '승인 대기', ACTIVE: '승인 완료', REMOVED: '반려',
};
const hrStatusCls: Record<HrStatus, string> = {
  PENDING: 'pending', ACTIVE: 'normal', REMOVED: 'blinded',
};

export default function UserManagementPage() {
  const [tab, setTab] = useState<MemberTab>('user');

  // ── 개인 회원 상태 ─────────────────────────────────────────
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [memberTotalItems, setMemberTotalItems] = useState(0);
  const [memberPage, setMemberPage] = useState(1);
  const [memberTotalPages, setMemberTotalPages] = useState(1);
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');

  const [userKeyword, setUserKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedMember, setSelectedMember] = useState<MemberDetailItem | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<MemberItem | null>(null);
  const [suspendPeriod, setSuspendPeriod] = useState<SuspendDuration>('SEVEN_DAYS');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [suspendError, setSuspendError] = useState('');
  const [unsuspendTarget, setUnsuspendTarget] = useState<MemberItem | null>(null);
  const [unsuspendReason, setUnsuspendReason] = useState('');
  const [unsuspendLoading, setUnsuspendLoading] = useState(false);
  const [unsuspendError, setUnsuspendError] = useState('');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [confirmViewTarget, setConfirmViewTarget] = useState<string | null>(null);

  // ── KPI 집계 상태 ─────────────────────────────────────────
  const [memberCounts, setMemberCounts] = useState<MemberCounts | null>(null);

  // ── 기업 회원 상태 ─────────────────────────────────────────
  const [hrManagers, setHrManagers] = useState<HrManagerItem[]>([]);
  const [hrTotalItems, setHrTotalItems] = useState(0);
  const [hrPendingCount, setHrPendingCount] = useState(0);
  const [hrPage, setHrPage] = useState(1);
  const [hrTotalPages, setHrTotalPages] = useState(1);
  const [hrLoading, setHrLoading] = useState(false);
  const [hrError, setHrError] = useState('');

  const [companyKeyword, setCompanyKeyword] = useState('');
  const [hrStatusFilter, setHrStatusFilter] = useState('');

  const [selectedCompany, setSelectedCompany] = useState<HrManagerDetail | null>(null);
  const [approveTarget, setApproveTarget] = useState<HrManagerItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<HrManagerItem | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  // ── 적용 필터 ref (검색 버튼/Enter 시에만 갱신) ───────────
  const appliedMemberFilters = useRef({ role: '', status: '', plan: '', keyword: '', startDate: '', endDate: '' });
  const appliedHrFilters = useRef({ hrStatus: '', keyword: '' });

  // ── 요청 ID ref (stale 응답 방지) ─────────────────────────
  const memberReqId = useRef(0);
  const memberDetailReqId = useRef(0);
  const hrReqId = useRef(0);

  // ── 개인 회원 목록 조회 ────────────────────────────────────
  const fetchMembers = useCallback(async (page = 1) => {
    const reqId = ++memberReqId.current;
    const f = appliedMemberFilters.current;
    setMemberLoading(true);
    setMemberError('');
    try {
      const res = await memberApi.getMembers({
        ...(f.role && { role: f.role as any }),
        ...(f.status && { status: f.status as any }),
        ...(f.plan && { plan: f.plan as any }),
        ...(f.keyword && { keyword: f.keyword }),
        ...(f.startDate && { startDate: f.startDate }),
        ...(f.endDate && { endDate: f.endDate }),
        page,
        size: 20,
      });
      if (reqId !== memberReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      const { items, totalItems, totalPages } = res.data.data;
      setMembers(items);
      setMemberTotalItems(totalItems);
      setMemberTotalPages(totalPages);
      setMemberPage(page);
    } catch (err: any) {
      if (reqId !== memberReqId.current) return;
      setMemberError(err.response?.data?.message || (err.response ? `회원 목록을 불러오지 못했습니다. (${err.response.status})` : err.message) || '회원 목록을 불러오지 못했습니다.');
    } finally {
      if (reqId === memberReqId.current) setMemberLoading(false);
    }
  }, []);

  // ── 기업 회원 목록 조회 ────────────────────────────────────
  const fetchHrManagers = useCallback(async (page = 1) => {
    const reqId = ++hrReqId.current;
    const f = appliedHrFilters.current;
    setHrLoading(true);
    setHrError('');
    try {
      const res = await memberApi.getHrManagers({
        ...(f.hrStatus && { hrStatus: f.hrStatus as any }),
        ...(f.keyword && { keyword: f.keyword }),
        page,
        size: 20,
      });
      if (reqId !== hrReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      const { items, totalItems, totalPages, pendingCount } = res.data.data;
      setHrManagers(items);
      setHrTotalItems(totalItems);
      setHrTotalPages(totalPages);
      setHrPendingCount(pendingCount);
      setHrPage(page);
    } catch (err: any) {
      if (reqId !== hrReqId.current) return;
      setHrError(err.response?.data?.message || (err.response ? `기업 회원 목록을 불러오지 못했습니다. (${err.response.status})` : err.message) || '기업 회원 목록을 불러오지 못했습니다.');
    } finally {
      if (reqId === hrReqId.current) setHrLoading(false);
    }
  }, []);

  // ── 검색 적용 핸들러 ───────────────────────────────────────
  const applyMemberSearch = () => {
    appliedMemberFilters.current = { role: roleFilter, status: statusFilter, plan: planFilter, keyword: userKeyword, startDate, endDate };
    fetchMembers(1);
  };

  const applyHrSearch = () => {
    appliedHrFilters.current = { hrStatus: hrStatusFilter, keyword: companyKeyword };
    fetchHrManagers(1);
  };

  const openMemberDetail = (memberId: string) => {
    const role = adminSession.getRole();
    if (role !== 'MASTER') {
      setConfirmViewTarget(memberId);
      return;
    }
    fetchMemberDetail(memberId);
  };

  const fetchMemberDetail = async (memberId: string) => {
    const reqId = ++memberDetailReqId.current;
    try {
      const res = await memberApi.getMemberDetail(memberId);
      if (reqId !== memberDetailReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      setSelectedMember(res.data.data);
    } catch (err: any) {
      if (reqId !== memberDetailReqId.current) return;
      alert(err.message || '회원 상세 정보를 불러오지 못했습니다.');
    }
  };

  const fetchMemberCounts = useCallback(async () => {
    try {
      const res = await memberApi.getMemberCounts();
      if (res.data.success) setMemberCounts(res.data.data);
    } catch {}
  }, []);

  useEffect(() => { fetchMembers(1); }, [fetchMembers]);
  useEffect(() => { fetchHrManagers(1); }, [fetchHrManagers]);
  useEffect(() => { fetchMemberCounts(); }, [fetchMemberCounts]);

  // ── 제재 처리 ──────────────────────────────────────────────
  const openSuspend = (member: MemberItem) => {
    setSelectedMember(null);
    setSuspendTarget(member);
    setSuspendPeriod('SEVEN_DAYS');
    setSuspendReason('');
    setSuspendError('');
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setSuspendLoading(true);
    setSuspendError('');
    try {
      const res = await memberApi.sanctionMember(suspendTarget.memberId, {
        sanctionType: 'SUSPEND',
        duration: suspendPeriod,
        reason: suspendReason,
      });
      if (!res.data.success) throw new Error(res.data.message);
      setSuspendTarget(null);
      fetchMembers(memberPage);
      fetchMemberCounts();
    } catch (err: any) {
      const msg = err.response?.data?.message || (err instanceof Error ? err.message : '');
      setSuspendError(msg || '제재 처리에 실패했습니다.');
    } finally {
      setSuspendLoading(false);
    }
  };

  // ── 정지 해제 처리 ─────────────────────────────────────────
  const openUnsuspend = (member: MemberItem) => {
    setSelectedMember(null);
    setUnsuspendTarget(member);
    setUnsuspendReason('');
    setUnsuspendError('');
  };

  const handleUnsuspend = async () => {
    if (!unsuspendTarget) return;
    setUnsuspendLoading(true);
    setUnsuspendError('');
    try {
      const res = await memberApi.unsuspendMember(unsuspendTarget.memberId, {
        reason: unsuspendReason,
      });
      if (!res.data.success) throw new Error(res.data.message);
      setUnsuspendTarget(null);
      fetchMembers(memberPage);
      fetchMemberCounts();
    } catch (err: unknown) {
      const msg = (err as any).response?.data?.message || (err instanceof Error ? err.message : '');
      setUnsuspendError(msg || '정지 해제에 실패했습니다.');
    } finally {
      setUnsuspendLoading(false);
    }
  };

  // ── 기업 회원 상세 조회 ────────────────────────────────────
  const openCompanyDetail = async (item: HrManagerItem) => {
    try {
      const res = await memberApi.getHrManagerDetail(item.memberId);
      if (!res.data.success) throw new Error(res.data.message);
      setSelectedCompany(res.data.data);
    } catch {
      setSelectedCompany({ ...item, rejectReason: null });
    }
  };

  // ── 승인 처리 ──────────────────────────────────────────────
  const handleApprove = async () => {
    if (!approveTarget) return;
    setApproveLoading(true);
    setActionError('');
    try {
      const res = await memberApi.approveHrManager(approveTarget.memberId);
      if (!res.data.success) throw new Error(res.data.message);
      setApproveTarget(null);
      fetchHrManagers(hrPage);
    } catch (err: any) {
      const msg = err.response?.data?.message || (err instanceof Error ? err.message : '');
      setActionError(msg || '승인 처리에 실패했습니다.');
    } finally {
      setApproveLoading(false);
    }
  };

  // ── 반려 처리 ──────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectTarget) return;
    if (rejectReasonInput.trim().length < 10) {
      setActionError('반려 사유는 최소 10자 이상 입력해주세요.');
      return;
    }
    setRejectLoading(true);
    setActionError('');
    try {
      const res = await memberApi.rejectHrManager(rejectTarget.memberId, { rejectReason: rejectReasonInput });
      if (!res.data.success) throw new Error(res.data.message);
      setRejectTarget(null);
      setRejectReasonInput('');
      fetchHrManagers(hrPage);
    } catch (err: any) {
      const msg = err.response?.data?.message || (err instanceof Error ? err.message : '');
      setActionError(msg || '반려 처리에 실패했습니다.');
    } finally {
      setRejectLoading(false);
    }
  };

  // ── 체크박스 ───────────────────────────────────────────────
  const toggleAll = (checked: boolean) =>
    setCheckedIds(checked ? members.map((m) => m.memberId) : []);
  const toggleOne = (id: string, checked: boolean) =>
    setCheckedIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));

  // ── 페이지네이션 렌더 ──────────────────────────────────────
  const renderPagination = (current: number, total: number, onMove: (p: number) => void) => (
    <div className="pagination">
      <button disabled={current <= 1} onClick={() => onMove(current - 1)}>{'<'}</button>
      {Array.from({ length: Math.min(total, 5) }, (_, i) => {
        const p = Math.max(1, current - 2) + i;
        if (p > total) return null;
        return (
          <button key={p} className={p === current ? 'activePage' : ''} onClick={() => onMove(p)}>
            {p}
          </button>
        );
      })}
      <button disabled={current >= total} onClick={() => onMove(current + 1)}>{'>'}</button>
    </div>
  );

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
            {hrPendingCount > 0 && <span className="tabBadge">{hrPendingCount}</span>}
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
                <h3>{memberTotalItems.toLocaleString()}</h3>
                <span>누적 가입 회원</span>
              </div>
              <div className="memberKpiIcon kpi-blue"><Users size={26} /></div>
            </article>
            <article className="memberSummaryCard kpi-green">
              <div className="memberKpiContent">
                <p>오늘 신규 가입</p>
                <h3>{memberCounts != null ? memberCounts.todayJoinCount.toLocaleString() : '—'}</h3>
                <span>오늘 가입 회원</span>
              </div>
              <div className="memberKpiIcon kpi-green"><UserPlus size={26} /></div>
            </article>
            <article className="memberSummaryCard kpi-purple">
              <div className="memberKpiContent">
                <p>프리미엄 구독</p>
                <h3>{memberCounts != null ? memberCounts.premiumCount.toLocaleString() : '—'}</h3>
                <span>유료 구독 회원</span>
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
                <h3>{memberCounts != null ? memberCounts.suspendedCount.toLocaleString() : '—'}</h3>
                <span>현재 정지 중</span>
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
              onKeyDown={(e) => e.key === 'Enter' && applyMemberSearch()}
            />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">권한 전체</option>
              <option value={MEMBER_ROLE.USER}>일반 회원</option>
              <option value={MEMBER_ROLE.COMPANY}>기업 회원</option>
            </select>
            <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
              <option value="">구독 전체</option>
              <option value="FREE">FREE</option>
              <option value="PREMIUM">PREMIUM</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">상태 전체</option>
              <option value="ACTIVE">정상</option>
              <option value="SUSPENDED">정지</option>
              <option value="BANNED">영구정지</option>
              <option value="LOCKED">잠금</option>
              <option value="WITHDRAWN">탈퇴</option>
            </select>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <span style={{ fontSize: 13, color: '#7a8da4', fontWeight: 600 }}>~</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            <button className="memberFilterBtn" onClick={applyMemberSearch}>검색</button>
          </section>

          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>
                회원 목록
                <span className="memberTotalCount">전체 {memberTotalItems.toLocaleString()}명</span>
              </h3>
            </div>

            {memberError && (
              <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{memberError}</p>
            )}

            <div className="tableScroll">
              <table className="memberTable">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={checkedIds.length === members.length && members.length > 0}
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
                  {memberLoading ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#7a8da4' }}>불러오는 중...</td></tr>
                  ) : members.map((m, idx) => (
                    <tr key={m.memberId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checkedIds.includes(m.memberId)}
                          onChange={(e) => toggleOne(m.memberId, e.target.checked)}
                        />
                      </td>
                      <td style={{ color: '#7a8da4', fontSize: 13 }}>{memberTotalItems - (memberPage - 1) * 20 - idx}</td>
                      <td><strong style={{ color: '#1a2941' }}>{m.name}</strong></td>
                      <td>{m.email}</td>
                      <td style={{ color: '#7a8da4', fontSize: 13 }}>{m.loginId}</td>
                      <td><span className={`roleBadge ${m.role === MEMBER_ROLE.USER ? 'roleBadge--user' : 'roleBadge--company'}`}>{m.role === MEMBER_ROLE.USER ? '개인' : '기업'}</span></td>
                      <td><span className={`planBadge ${m.plan.toLowerCase()}`}>{m.plan}</span></td>
                      <td>{new Date(m.joinedAt).toLocaleDateString('ko-KR')}</td>
                      <td><span className={`statusBadge ${memberStatusCls[m.memberStatus]}`}>{memberStatusLabel[m.memberStatus]}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="tableBtn" onClick={() => openMemberDetail(m.memberId)}>상세보기</button>
                          {m.memberStatus === MEMBER_STATUS.SUSPENDED ? (
                            <button className="tableBtn tableBtn--success" onClick={() => openUnsuspend(m)}>정지해제</button>
                          ) : (
                            <button className="tableBtn tableBtn--danger" onClick={() => openSuspend(m)} disabled={m.memberStatus === MEMBER_STATUS.WITHDRAWN}>정지처리</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="memberTableFooter">
                <span className="memberTableCount">
                  표시 중: {(memberPage - 1) * 20 + 1} - {Math.min(memberPage * 20, memberTotalItems)} / 전체 {memberTotalItems.toLocaleString()}명
                </span>
                {renderPagination(memberPage, memberTotalPages, fetchMembers)}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── 기업 회원 탭 ─────────────────────────────────── */}
      {tab === 'company' && (
        <div className="memberPage">
          <section className="memberSummaryGrid">
            <article className="memberSummaryCard kpi-blue">
              <div className="memberKpiContent">
                <p>전체 기업회원</p>
                <h3>{hrTotalItems}</h3>
                <span>가입 신청 누계</span>
              </div>
              <div className="memberKpiIcon kpi-blue"><Building2 size={26} /></div>
            </article>
            <article className="memberSummaryCard kpi-yellow">
              <div className="memberKpiContent">
                <p>승인 대기</p>
                <h3>{hrPendingCount}</h3>
                <span>재직증명서 검토 필요</span>
              </div>
              <div className="memberKpiIcon kpi-yellow"><Clock size={26} /></div>
            </article>
            <article className="memberSummaryCard kpi-green">
              <div className="memberKpiContent">
                <p>승인 완료</p>
                <h3>{hrManagers.filter((c) => c.hrStatus === 'ACTIVE').length}</h3>
                <span>현재 페이지 기준</span>
              </div>
              <div className="memberKpiIcon kpi-green"><CheckCircle size={26} /></div>
            </article>
            <article className="memberSummaryCard kpi-yellow" style={{ background: 'linear-gradient(135deg, #fde8e8 0%, #fef2f2 100%)', borderColor: '#f0b8b8' }}>
              <div className="memberKpiContent">
                <p style={{ color: '#8a2020' }}>반려</p>
                <h3 style={{ color: '#5e1010' }}>{hrManagers.filter((c) => c.hrStatus === 'REMOVED').length}</h3>
                <span style={{ color: '#9e3030' }}>현재 페이지 기준</span>
              </div>
              <div className="memberKpiIcon kpi-yellow" style={{ background: 'rgba(178, 58, 58, 0.16)', color: '#8a2020' }}><XCircle size={26} /></div>
            </article>
          </section>

          <section className="admin-card memberFilter">
            <input
              type="text"
              placeholder="담당자명, 기업명, 이메일 검색"
              value={companyKeyword}
              onChange={(e) => setCompanyKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyHrSearch()}
            />
            <select value={hrStatusFilter} onChange={(e) => setHrStatusFilter(e.target.value)}>
              <option value="">전체</option>
              <option value="PENDING">승인 대기</option>
              <option value="ACTIVE">승인 완료</option>
              <option value="REMOVED">반려</option>
            </select>
            <button className="memberFilterBtn" onClick={applyHrSearch}>검색</button>
          </section>

          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>
                기업회원 가입 신청 목록
                <span className="memberTotalCount">전체 {hrTotalItems}건</span>
              </h3>
            </div>

            {hrError && (
              <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{hrError}</p>
            )}

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
                  {hrLoading ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: '#7a8da4' }}>불러오는 중...</td></tr>
                  ) : hrManagers.map((c) => (
                    <tr key={c.memberId}>
                      <td style={{ color: '#7a8da4', fontSize: 13 }}>{c.memberId.slice(0, 8)}…</td>
                      <td><strong style={{ color: '#1a2941' }}>{c.hrName}</strong></td>
                      <td>{c.email}</td>
                      <td>{c.companyName}</td>
                      <td style={{ color: '#7a8da4', fontSize: 13 }}>{c.certificateNumber}</td>
                      <td>
                        <span className="certFileLink" title={c.certFileName}>
                          📄 {c.certFileName.length > 18 ? c.certFileName.slice(0, 18) + '…' : c.certFileName}
                        </span>
                      </td>
                      <td>{new Date(c.joinedAt).toLocaleDateString('ko-KR')}</td>
                      <td>
                        <span className={`statusBadge ${hrStatusCls[c.hrStatus]}`}>
                          {hrStatusLabel[c.hrStatus]}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="tableBtn" onClick={() => openCompanyDetail(c)}>상세보기</button>
                          {c.hrStatus === 'PENDING' && (
                            <button className="tableBtn tableBtn--approve" onClick={() => setApproveTarget(c)}>승인</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="memberTableFooter">
                <span className="memberTableCount">
                  표시 중: {(hrPage - 1) * 20 + 1} - {Math.min(hrPage * 20, hrTotalItems)} / 전체 {hrTotalItems}건
                </span>
                {renderPagination(hrPage, hrTotalPages, fetchHrManagers)}
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
                <p>{selectedMember.loginId} · {selectedMember.email}</p>
              </div>
              <button onClick={() => setSelectedMember(null)}>닫기</button>
            </div>
            <div className="modalInfoGrid">
              <div><span>권한</span><strong>{selectedMember.role === MEMBER_ROLE.USER ? '개인 회원' : '기업 회원'}</strong></div>
              <div><span>구독 플랜</span><strong>{selectedMember.plan}</strong></div>
              <div><span>가입일</span><strong>{new Date(selectedMember.joinedAt).toLocaleDateString('ko-KR')}</strong></div>
              <div><span>최근 접속</span><strong>{selectedMember.lastLoginAt ? new Date(selectedMember.lastLoginAt).toLocaleDateString('ko-KR') : '—'}</strong></div>
              <div><span>현재 상태</span><strong><span className={`statusBadge ${memberStatusCls[selectedMember.memberStatus]}`}>{memberStatusLabel[selectedMember.memberStatus]}</span></strong></div>
              <div><span>신고 받은 횟수</span><strong>{selectedMember.reportCount}건</strong></div>
              {(selectedMember.sanctionType === 'SUSPEND' || selectedMember.sanctionType === 'BLACKLIST') && (
                <>
                  <div><span>제재 유형</span><strong>{{ WARNING: '경고', SUSPEND: '활동 정지', BLACKLIST: '영구 정지' }[selectedMember.sanctionType]}</strong></div>
                  <div><span>정지 기간</span><strong>
                    {selectedMember.suspendStartDate ? new Date(selectedMember.suspendStartDate).toLocaleDateString('ko-KR') : '—'}
                    {' ~ '}
                    {selectedMember.suspendDuration === 'PERMANENT'
                      ? '영구'
                      : selectedMember.suspendEndDate
                      ? new Date(selectedMember.suspendEndDate).toLocaleDateString('ko-KR')
                      : '—'}
                  </strong></div>
                </>
              )}
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
                  {selectedMember.warningCount >= WARN_THRESHOLD && <span className="warnAlert">활동정지 권고</span>}
                  {selectedMember.warningCount === WARN_THRESHOLD - 1 && <span className="warnCaution">1회 추가 시 활동정지 권고</span>}
                </div>
              </div>
            </div>
            <div className="modalAction">
              {selectedMember.memberStatus === MEMBER_STATUS.SUSPENDED ? (
                <button onClick={() => openUnsuspend(selectedMember)} style={{ background: '#2e7d32', color: 'white', borderColor: '#2e7d32' }}>정지 해제</button>
              ) : (
                <button onClick={() => openSuspend(selectedMember)} disabled={selectedMember?.memberStatus === MEMBER_STATUS.WITHDRAWN}>활동 정지</button>
              )}
              <button onClick={() => setSelectedMember(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 개인정보 조회 확인 모달 ──────────────────────────── */}
      {confirmViewTarget && (
        <div className="modalOverlay" onClick={() => setConfirmViewTarget(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 420 }}>
            <div className="modalHeader">
              <div><h3>개인정보 열람 확인</h3></div>
              <button onClick={() => setConfirmViewTarget(null)}>닫기</button>
            </div>
            <div className="modalInfoGrid">
              <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 14, lineHeight: 1.7, color: '#3a4f6a' }}>
                이 회원의 개인정보(이름·이메일)를 조회하시겠습니까?<br />
                조회 시 감사로그에 기록됩니다.
              </p>
            </div>
            <div className="modalAction">
              <button onClick={() => {
                const target = confirmViewTarget;
                setConfirmViewTarget(null);
                fetchMemberDetail(target);
              }}>확인</button>
              <button onClick={() => setConfirmViewTarget(null)}>취소</button>
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
                <p>{suspendTarget.name} · {suspendTarget.loginId}</p>
              </div>
              <button onClick={() => setSuspendTarget(null)}>닫기</button>
            </div>
            <div className="modalInfoGrid">
              <div style={{ gridColumn: '1 / -1' }}>
                <span>정지 기간</span>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  {SUSPEND_PERIODS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setSuspendPeriod(p)}
                      style={{
                        height: 36, padding: '0 16px', borderRadius: 8, fontFamily: 'inherit',
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
              <div style={{ gridColumn: '1 / -1' }}>
                <span>정지 사유</span>
                <textarea
                  placeholder="이용 약관 위반 내용을 입력하세요 (최소 10자)"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  style={{
                    marginTop: 8, width: '100%', minHeight: 90, boxSizing: 'border-box',
                    border: '1px solid #d8e3ed', borderRadius: 10, padding: '10px 12px',
                    outline: 'none', resize: 'vertical', background: 'white',
                    fontSize: 14, fontFamily: 'inherit', color: '#10243f', lineHeight: 1.7,
                  }}
                />
              </div>
              {suspendError && (
                <p style={{ gridColumn: '1 / -1', fontSize: 13, color: '#9a4444', margin: 0 }}>{suspendError}</p>
              )}
            </div>
            <div className="modalAction">
              <button
                onClick={handleSuspend}
                disabled={suspendLoading}
                style={suspendPeriod === 'PERMANENT' ? { background: '#9a6767', color: 'white', borderColor: '#9a6767' } : {}}
              >
                {suspendLoading ? '처리 중...' : `${durationLabel[suspendPeriod]} 정지 처리`}
              </button>
              <button onClick={() => setSuspendTarget(null)} disabled={suspendLoading}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 정지 해제 모달 ──────────────────────────────────── */}
      {unsuspendTarget && (
        <div className="modalOverlay" onClick={() => setUnsuspendTarget(null)}>
          <div className="memberModal" onClick={(e) => e.stopPropagation()} style={{ width: 480 }}>
            <div className="modalHeader">
              <div>
                <h3>정지 해제</h3>
                <p>{unsuspendTarget.name} · {unsuspendTarget.loginId}</p>
              </div>
              <button onClick={() => setUnsuspendTarget(null)}>닫기</button>
            </div>
            <div className="modalBody" style={{ display: 'grid', gap: 16, padding: '20px 24px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <span>해제 사유</span>
                <textarea
                  placeholder="정지 해제 사유를 입력하세요 (최소 10자)"
                  value={unsuspendReason}
                  onChange={(e) => setUnsuspendReason(e.target.value)}
                  style={{
                    marginTop: 8, width: '100%', minHeight: 90, boxSizing: 'border-box',
                    border: '1px solid #d8e3ed', borderRadius: 10, padding: '10px 12px',
                    outline: 'none', resize: 'vertical', background: 'white',
                    fontSize: 14, fontFamily: 'inherit', color: '#10243f', lineHeight: 1.7,
                  }}
                />
              </div>
              {unsuspendError && (
                <p style={{ gridColumn: '1 / -1', fontSize: 13, color: '#9a4444', margin: 0 }}>{unsuspendError}</p>
              )}
            </div>
            <div className="modalAction">
              <button
                onClick={handleUnsuspend}
                disabled={unsuspendLoading || unsuspendReason.trim().length < 10}
                style={{ background: '#2e7d32', color: 'white', borderColor: '#2e7d32' }}
              >
                {unsuspendLoading ? '처리 중...' : '정지 해제'}
              </button>
              <button onClick={() => setUnsuspendTarget(null)} disabled={unsuspendLoading}>취소</button>
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
                <p>{selectedCompany.memberId.slice(0, 8)}… · {selectedCompany.email}</p>
              </div>
              <button onClick={() => setSelectedCompany(null)}>닫기</button>
            </div>
            <div className="modalInfoGrid">
              <div><span>HR 담당자명</span><strong>{selectedCompany.hrName}</strong></div>
              <div><span>이메일</span><strong>{selectedCompany.email}</strong></div>
              <div><span>기업명</span><strong>{selectedCompany.companyName}</strong></div>
              <div><span>사업자등록번호</span><strong>{selectedCompany.certificateNumber}</strong></div>
              <div><span>가입일</span><strong>{new Date(selectedCompany.joinedAt).toLocaleDateString('ko-KR')}</strong></div>
              <div>
                <span>승인 상태</span>
                <strong>
                  <span className={`statusBadge ${hrStatusCls[selectedCompany.hrStatus]}`}>
                    {hrStatusLabel[selectedCompany.hrStatus]}
                  </span>
                </strong>
              </div>
            </div>
            <div style={{ margin: '16px 0 0', padding: '14px 16px', borderRadius: 12, background: '#f3f7fc', border: '1px solid #d8e8f5' }}>
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#31475f' }}>재직증명서</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#4a7299' }}>📄 {selectedCompany.certFileName}</span>
                <a href={selectedCompany.certFileUrl} target="_blank" rel="noopener noreferrer" className="tableBtn" style={{ marginLeft: 'auto' }}>파일 확인</a>
              </div>
            </div>
            {selectedCompany.rejectReason && (
              <div style={{ margin: '12px 0 0', padding: '12px 14px', borderRadius: 10, background: '#fff5f5', border: '1px solid #ffd5d5', fontSize: 13, color: '#9a4444' }}>
                <strong>반려 사유:</strong> {selectedCompany.rejectReason}
              </div>
            )}
            <div className="modalAction">
              {selectedCompany.hrStatus === 'PENDING' && (
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
            {actionError && <p style={{ fontSize: 13, color: '#9a4444', margin: '8px 0 0' }}>{actionError}</p>}
            <div className="modalAction">
              <button
                style={{ background: '#24496f', color: 'white', borderColor: '#24496f' }}
                onClick={handleApprove}
                disabled={approveLoading}
              >
                {approveLoading ? '처리 중...' : '승인 확정'}
              </button>
              <button onClick={() => setApproveTarget(null)} disabled={approveLoading}>취소</button>
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
                  placeholder="예) 재직증명서 유효기간 만료 — 3개월 이내 발급 서류로 재제출 해주세요. (최소 10자)"
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  style={{ minHeight: 90 }}
                />
              </div>
              {actionError && <p style={{ fontSize: 13, color: '#9a4444', margin: '0' }}>{actionError}</p>}
            </div>
            <div className="modalAction">
              <button
                style={{ background: '#9a6767', color: 'white', borderColor: '#9a6767' }}
                onClick={handleReject}
                disabled={rejectLoading}
              >
                {rejectLoading ? '처리 중...' : '반려 처리'}
              </button>
              <button onClick={() => setRejectTarget(null)} disabled={rejectLoading}>취소</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
