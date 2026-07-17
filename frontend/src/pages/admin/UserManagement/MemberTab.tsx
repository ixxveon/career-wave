import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Users, UserPlus, UserX } from 'lucide-react';
import {
  memberApi,
  MEMBER_ROLE,
  MEMBER_STATUS,
  type MemberItem,
  type MemberDetailItem,
  type MemberStatus,
  type MemberCounts,
} from '../../../api/admin/memberApi';
import { adminSession } from '../../../api/admin/adminSession';
import { MemberDetailModal, ConfirmViewModal, SuspendModal, UnsuspendModal, UnbanModal } from './MemberModals';

const memberStatusLabel: Record<MemberStatus, string> = {
  ACTIVE: '정상', SUSPENDED: '정지', BANNED: '영구정지', LOCKED: '잠금', WITHDRAWN: '탈퇴',
};
const memberStatusCls: Record<MemberStatus, string> = {
  ACTIVE: 'normal', SUSPENDED: 'blinded', BANNED: 'dismissed', LOCKED: 'pending', WITHDRAWN: 'dismissed',
};

export default function MemberTab() {
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
  const [unsuspendTarget, setUnsuspendTarget] = useState<MemberItem | null>(null);
  const [unbanTarget, setUnbanTarget] = useState<MemberItem | null>(null);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [confirmViewTarget, setConfirmViewTarget] = useState<string | null>(null);
  const [memberCounts, setMemberCounts] = useState<MemberCounts | null>(null);

  const appliedMemberFilters = useRef({ role: '', status: '', plan: '', keyword: '', startDate: '', endDate: '' });
  const memberReqId = useRef(0);
  const memberDetailReqId = useRef(0);

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
        page, size: 20,
      });
      if (reqId !== memberReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      const { items, totalItems, totalPages } = res.data.data;
      setMembers(items);
      setMemberTotalItems(totalItems);
      setMemberTotalPages(totalPages);
      setMemberPage(page);
    } catch (err: unknown) {
      if (reqId !== memberReqId.current) return;
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        setMemberError(err.response?.data?.message || (status ? `회원 목록을 불러오지 못했습니다. (${status})` : '네트워크 연결을 확인해주세요.'));
      } else setMemberError(err instanceof Error ? err.message : '회원 목록을 불러오지 못했습니다.');
    } finally {
      if (reqId === memberReqId.current) setMemberLoading(false);
    }
  }, []);

  const fetchMemberDetail = async (memberId: string) => {
    const reqId = ++memberDetailReqId.current;
    try {
      const res = await memberApi.getMemberDetail(memberId);
      if (reqId !== memberDetailReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      setSelectedMember(res.data.data);
    } catch (err: unknown) {
      if (reqId !== memberDetailReqId.current) return;
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : err instanceof Error ? err.message : '';
      alert(msg || '회원 상세 정보를 불러오지 못했습니다.');
    }
  };

  const fetchMemberCounts = useCallback(async () => {
    try {
      const res = await memberApi.getMemberCounts();
      if (res.data.success) setMemberCounts(res.data.data);
    } catch {}
  }, []);

  useEffect(() => { fetchMembers(1); }, [fetchMembers]);
  useEffect(() => { fetchMemberCounts(); }, [fetchMemberCounts]);

  const applyMemberSearch = () => {
    // 기업 회원은 구독 플랜이 "해당없음"으로 표시되므로, 플랜 필터를 적용하지 않는다.
    const plan = roleFilter === MEMBER_ROLE.COMPANY ? '' : planFilter;
    appliedMemberFilters.current = { role: roleFilter, status: statusFilter, plan, keyword: userKeyword, startDate, endDate };
    fetchMembers(1);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    if (value === MEMBER_ROLE.COMPANY) setPlanFilter('');
  };

  const openMemberDetail = (memberId: string) => {
    const role = adminSession.getRole();
    if (role !== 'MASTER') { setConfirmViewTarget(memberId); return; }
    fetchMemberDetail(memberId);
  };

  const refreshList = () => { fetchMembers(memberPage); fetchMemberCounts(); };

  const toggleAll = (checked: boolean) =>
    setCheckedIds(checked ? members.map((m) => m.memberId) : []);
  const toggleOne = (id: string, checked: boolean) =>
    setCheckedIds((prev) => (checked ? [...prev, id] : prev.filter((v) => v !== id)));

  const renderPagination = (current: number, total: number, onMove: (p: number) => void) => (
    <div className="pagination">
      <button disabled={current <= 1} onClick={() => onMove(current - 1)}>{'<'}</button>
      {Array.from({ length: Math.min(total, 5) }, (_, i) => {
        const p = Math.max(1, current - 2) + i;
        if (p > total) return null;
        return <button key={p} className={p === current ? 'activePage' : ''} onClick={() => onMove(p)}>{p}</button>;
      })}
      <button disabled={current >= total} onClick={() => onMove(current + 1)}>{'>'}</button>
    </div>
  );

  return (
    <div className="memberPage">
      <section className="memberSummaryGrid">
        <article className="memberSummaryCard kpi-blue">
          <div className="memberKpiContent"><p>전체 회원 수</p><h3>{memberTotalItems.toLocaleString()}</h3><span>누적 가입 회원</span></div>
          <div className="memberKpiIcon kpi-blue"><Users size={26} /></div>
        </article>
        <article className="memberSummaryCard kpi-green">
          <div className="memberKpiContent"><p>오늘 신규 가입</p><h3>{memberCounts != null ? memberCounts.todayJoinCount.toLocaleString() : '—'}</h3><span>오늘 가입 회원</span></div>
          <div className="memberKpiIcon kpi-green"><UserPlus size={26} /></div>
        </article>
        <article className="memberSummaryCard kpi-purple">
          <div className="memberKpiContent"><p>프리미엄 구독</p><h3>{memberCounts != null ? memberCounts.premiumCount.toLocaleString() : '—'}</h3><span>유료 구독 회원</span></div>
          <div className="memberKpiIcon kpi-purple">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
            </svg>
          </div>
        </article>
        <article className="memberSummaryCard kpi-yellow">
          <div className="memberKpiContent"><p>정지 회원 수</p><h3>{memberCounts != null ? memberCounts.suspendedCount.toLocaleString() : '—'}</h3><span>현재 정지 중</span></div>
          <div className="memberKpiIcon kpi-yellow"><UserX size={26} /></div>
        </article>
      </section>

      <section className="admin-card memberFilter">
        <input type="text" placeholder="이름, 이메일, 회원 ID 검색" value={userKeyword}
          onChange={(e) => setUserKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyMemberSearch()} />
        <select value={roleFilter} onChange={(e) => handleRoleFilterChange(e.target.value)}>
          <option value="">권한 전체</option>
          <option value={MEMBER_ROLE.USER}>일반 회원</option>
          <option value={MEMBER_ROLE.COMPANY}>기업 회원</option>
        </select>
        <select
          value={roleFilter === MEMBER_ROLE.COMPANY ? '' : planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          disabled={roleFilter === MEMBER_ROLE.COMPANY}
          title={roleFilter === MEMBER_ROLE.COMPANY ? '기업 회원은 구독 플랜이 없습니다' : undefined}
        >
          <option value="">구독 전체</option><option value="FREE">FREE</option><option value="PREMIUM">PREMIUM</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">상태 전체</option>
          <option value="ACTIVE">정상</option><option value="SUSPENDED">정지</option>
          <option value="BANNED">영구정지</option><option value="LOCKED">잠금</option><option value="WITHDRAWN">탈퇴</option>
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <span style={{ fontSize: 13, color: '#7a8da4', fontWeight: 600 }}>~</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="memberFilterBtn" onClick={applyMemberSearch}>검색</button>
      </section>

      <section className="admin-card memberTableCard">
        <div className="memberTableHeader">
          <h3>회원 목록 <span className="memberTotalCount">전체 {memberTotalItems.toLocaleString()}명</span></h3>
        </div>
        {memberError && <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{memberError}</p>}
        <div className="tableScroll">
          <table className="memberTable memberListTable">
            <thead>
              <tr>
                <th><input type="checkbox" checked={checkedIds.length === members.length && members.length > 0} onChange={(e) => toggleAll(e.target.checked)} /></th>
                <th>번호</th><th>이름</th><th>이메일</th><th>로그인ID</th><th>회원유형</th><th>플랜</th><th>가입일</th><th>상태</th><th>관리</th>
              </tr>
            </thead>
            <tbody>
              {memberLoading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: 32, color: '#7a8da4' }}>불러오는 중...</td></tr>
              ) : members.map((m, idx) => (
                <tr key={m.memberId}>
                  <td><input type="checkbox" checked={checkedIds.includes(m.memberId)} onChange={(e) => toggleOne(m.memberId, e.target.checked)} /></td>
                  <td style={{ color: '#7a8da4', fontSize: 13 }}>{memberTotalItems - (memberPage - 1) * 20 - idx}</td>
                  <td><strong style={{ color: '#1a2941' }}>{m.name}</strong></td>
                  <td>{m.email}</td>
                  <td style={{ color: '#7a8da4', fontSize: 13 }}>{m.loginId}</td>
                  <td><span className={`roleBadge ${m.role === MEMBER_ROLE.USER ? 'roleBadge--user' : 'roleBadge--company'}`}>{m.role === MEMBER_ROLE.USER ? '개인' : '기업'}</span></td>
                  <td>
                    {m.role === MEMBER_ROLE.USER
                      ? <span className={`planBadge ${m.plan.toLowerCase()}`}>{m.plan}</span>
                      : <span className="planBadge na">해당없음</span>}
                  </td>
                  <td>{new Date(m.joinedAt).toLocaleDateString('ko-KR')}</td>
                  <td><span className={`statusBadge ${memberStatusCls[m.memberStatus]}`}>{memberStatusLabel[m.memberStatus]}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button className="tableBtn memberActionBtn" onClick={() => openMemberDetail(m.memberId)}>상세보기</button>
                      {m.memberStatus === MEMBER_STATUS.SUSPENDED && (
                        <button className="tableBtn tableBtn--success memberActionBtn" onClick={() => { setSelectedMember(null); setUnsuspendTarget(m); }}>정지해제</button>
                      )}
                      {m.memberStatus === MEMBER_STATUS.BANNED && (
                        <button className="tableBtn tableBtn--success memberActionBtn" onClick={() => { setSelectedMember(null); setUnbanTarget(m); }}>영구정지 해제</button>
                      )}
                      {m.memberStatus !== MEMBER_STATUS.SUSPENDED && m.memberStatus !== MEMBER_STATUS.BANNED && (
                        <button className="tableBtn tableBtn--danger memberActionBtn" onClick={() => { setSelectedMember(null); setSuspendTarget(m); }} disabled={m.memberStatus === MEMBER_STATUS.WITHDRAWN}>정지처리</button>
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

      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onSuspend={(m) => { setSelectedMember(null); setSuspendTarget(m); }}
          onUnsuspend={(m) => { setSelectedMember(null); setUnsuspendTarget(m); }}
          onUnban={(m) => { setSelectedMember(null); setUnbanTarget(m); }}
        />
      )}
      {confirmViewTarget && (
        <ConfirmViewModal
          memberId={confirmViewTarget}
          onConfirm={(id) => { setConfirmViewTarget(null); fetchMemberDetail(id); }}
          onClose={() => setConfirmViewTarget(null)}
        />
      )}
      {suspendTarget && (
        <SuspendModal target={suspendTarget} onClose={() => setSuspendTarget(null)} onSuccess={refreshList} />
      )}
      {unsuspendTarget && (
        <UnsuspendModal target={unsuspendTarget} onClose={() => setUnsuspendTarget(null)} onSuccess={refreshList} />
      )}
      {unbanTarget && (
        <UnbanModal target={unbanTarget} onClose={() => setUnbanTarget(null)} onSuccess={refreshList} />
      )}
    </div>
  );
}
