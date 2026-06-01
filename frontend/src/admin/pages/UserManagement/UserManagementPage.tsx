import { useState, useEffect, useCallback } from 'react';
import { Building2, CheckCircle, Clock, UserPlus, UserX, Users, XCircle } from 'lucide-react';
import {
  memberApi,
  type MemberItem,
  type MemberStatus,
  type SuspendDuration,
  type HrManagerItem,
  type HrManagerDetail,
  type HrStatus,
} from '../../api/memberApi';
import '../../styles/admin.css';
import '../../styles/UserManagement.css';

type MemberTab = 'user' | 'company';

const WARN_THRESHOLD = 3;

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

  const [selectedMember, setSelectedMember] = useState<MemberItem | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<MemberItem | null>(null);
  const [suspendPeriod, setSuspendPeriod] = useState<SuspendDuration>('SEVEN_DAYS');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendLoading, setSuspendLoading] = useState(false);
  const [suspendError, setSuspendError] = useState('');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

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

  // ── 개인 회원 목록 조회 ────────────────────────────────────
  const fetchMembers = useCallback(async (page = 1) => {
    setMemberLoading(true);
    setMemberError('');
    try {
      const res = await memberApi.getMembers({
        ...(roleFilter && { role: roleFilter as any }),
        ...(statusFilter && { status: statusFilter as any }),
        ...(planFilter && { plan: planFilter as any }),
        ...(userKeyword && { keyword: userKeyword }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        page,
        size: 20,
      });
      const { items, totalItems, totalPages } = res.data.data;
      setMembers(items);
      setMemberTotalItems(totalItems);
      setMemberTotalPages(totalPages);
      setMemberPage(page);
    } catch {
      setMemberError('회원 목록을 불러오지 못했습니다.');
    } finally {
      setMemberLoading(false);
    }
  }, [roleFilter, statusFilter, planFilter, userKeyword, startDate, endDate]);

  // ── 기업 회원 목록 조회 ────────────────────────────────────
  const fetchHrManagers = useCallback(async (page = 1) => {
    setHrLoading(true);
    setHrError('');
    try {
      const res = await memberApi.getHrManagers({
        ...(hrStatusFilter && { hrStatus: hrStatusFilter as any }),
        ...(companyKeyword && { keyword: companyKeyword }),
        page,
        size: 20,
      });
      const { items, totalItems, totalPages, pendingCount } = res.data.data;
      setHrManagers(items);
      setHrTotalItems(totalItems);
      setHrTotalPages(totalPages);
      setHrPendingCount(pendingCount);
      setHrPage(page);
    } catch {
      setHrError('기업 회원 목록을 불러오지 못했습니다.');
    } finally {
      setHrLoading(false);
    }
  }, [hrStatusFilter, companyKeyword]);

  useEffect(() => { fetchMembers(1); }, [fetchMembers]);
  useEffect(() => { fetchHrManagers(1); }, [fetchHrManagers]);

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
      await memberApi.sanctionMember(suspendTarget.memberId, {
        sanctionType: 'SUSPEND',
        duration: suspendPeriod,
        reason: suspendReason,
      });
      setSuspendTarget(null);
      fetchMembers(memberPage);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setSuspendError(msg || '제재 처리에 실패했습니다.');
    } finally {
      setSuspendLoading(false);
    }
  };

  // ── 기업 회원 상세 조회 ────────────────────────────────────
  const openCompanyDetail = async (item: HrManagerItem) => {
    try {
      const res = await memberApi.getHrManagerDetail(item.memberId);
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
      await memberApi.approveHrManager(approveTarget.memberId);
      setApproveTarget(null);
      fetchHrManagers(hrPage);
    } catch (err: any) {
      const msg = err.response?.data?.message;
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
      await memberApi.rejectHrManager(rejectTarget.memberId, { rejectReason: rejectReasonInput });
      setRejectTarget(null);
      setRejectReasonInput('');
      fetchHrManagers(hrPage);
    } catch (err: any) {
      const msg = err.response?.data?.message;
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
                <h3>—</h3>
                <span>준비 중</span>
              </div>
              <div className="memberKpiIcon kpi-green"><UserPlus size={26} /></div>
            </article>
            <article className="memberSummaryCard kpi-purple">
              <div className="memberKpiContent">
                <p>프리미엄 구독</p>
                <h3>—</h3>
                <span>준비 중</span>
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
                <h3>—</h3>
                <span>준비 중</span>
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
              onKeyDown={(e) => e.key === 'Enter' && fetchMembers(1)}
            />
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">권한 전체</option>
              <option value="ROLE_USER">일반 회원</option>
              <option value="ROLE_COMPANY">기업 회원</option>
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
            </select>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ maxWidth: 160 }} />
            <span style={{ fontSize: 13, color: '#7a8da4', fontWeight: 600 }}>~</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ maxWidth: 160 }} />
          </section>

          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>
                회원 목록
                <span className="memberTotalCount">전체 {memberTotalItems.toLocaleString()}명</span>
              </h3>
              <button>회원 데이터 내보내기</button>
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
                  ) : members.map((m) => (
                    <tr key={m.memberId}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checkedIds.includes(m.memberId)}
                          onChange={(e) => toggleOne(m.memberId, e.target.checked)}
                        />
                      </td>
                      <td style={{ color: '#7a8da4', fontSize: 13 }}>{m.loginId}</td>
                      <td><strong style={{ color: '#1a2941' }}>{m.name}</strong></td>
                      <td>{m.email}</td>
                      <td style={{ color: '#7a8da4', fontSize: 13 }}>{m.loginId}</td>
                      <td><span className="roleBadge">{m.role === 'ROLE_USER' ? '개인' : '기업'}</span></td>
                      <td><span className={`planBadge ${m.plan.toLowerCase()}`}>{m.plan}</span></td>
                      <td>{new Date(m.joinedAt).toLocaleDateString('ko-KR')}</td>
                      <td><span className={`statusBadge ${memberStatusCls[m.memberStatus]}`}>{memberStatusLabel[m.memberStatus]}</span></td>
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
                <span>플랫폼 이용 가능</span>
              </div>
              <div className="memberKpiIcon kpi-green"><CheckCircle size={26} /></div>
            </article>
            <article className="memberSummaryCard kpi-yellow" style={{ background: 'linear-gradient(135deg, #fde8e8 0%, #fef2f2 100%)', borderColor: '#f0b8b8' }}>
              <div className="memberKpiContent">
                <p style={{ color: '#8a2020' }}>반려</p>
                <h3 style={{ color: '#5e1010' }}>{hrManagers.filter((c) => c.hrStatus === 'REMOVED').length}</h3>
                <span style={{ color: '#9e3030' }}>서류 재제출 안내 필요</span>
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
              onKeyDown={(e) => e.key === 'Enter' && fetchHrManagers(1)}
            />
            <select value={hrStatusFilter} onChange={(e) => setHrStatusFilter(e.target.value)}>
              <option value="">전체</option>
              <option value="PENDING">승인 대기</option>
              <option value="ACTIVE">승인 완료</option>
              <option value="REMOVED">반려</option>
            </select>
            <button className="memberFilterBtn" onClick={() => fetchHrManagers(1)}>검색</button>
          </section>

          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>
                기업회원 가입 신청 목록
                <span className="memberTotalCount">전체 {hrTotalItems}건</span>
              </h3>
              <button>데이터 내보내기</button>
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
              <div><span>권한</span><strong>{selectedMember.role === 'ROLE_USER' ? '개인 회원' : '기업 회원'}</strong></div>
              <div><span>구독 플랜</span><strong>{selectedMember.plan}</strong></div>
              <div><span>가입일</span><strong>{new Date(selectedMember.joinedAt).toLocaleDateString('ko-KR')}</strong></div>
              <div><span>최근 접속</span><strong>{selectedMember.lastLoginAt ? new Date(selectedMember.lastLoginAt).toLocaleDateString('ko-KR') : '—'}</strong></div>
              <div><span>현재 상태</span><strong><span className={`statusBadge ${memberStatusCls[selectedMember.memberStatus]}`}>{memberStatusLabel[selectedMember.memberStatus]}</span></strong></div>
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
                  {selectedMember.warningCount >= WARN_THRESHOLD && <span className="warnAlert">활동정지 권고</span>}
                  {selectedMember.warningCount === WARN_THRESHOLD - 1 && <span className="warnCaution">1회 추가 시 활동정지 권고</span>}
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
                <p>{suspendTarget.name} · {suspendTarget.loginId}</p>
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
                  placeholder="이용 약관 위반 내용을 입력하세요 (최소 10자)"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  style={{ minHeight: 80 }}
                />
              </div>
              {suspendError && (
                <p style={{ fontSize: 13, color: '#9a4444', margin: '0 0 4px' }}>{suspendError}</p>
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
