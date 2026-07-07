import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Building2, CheckCircle, Clock, XCircle } from 'lucide-react';
import {
  memberApi,
  type HrManagerItem,
  type HrManagerDetail,
  type HrStatus,
} from '../../../api/admin/memberApi';
import { CompanyDetailModal, ApproveModal, RejectModal } from './CompanyModals';

const hrStatusLabel: Record<HrStatus, string> = {
  PENDING_REVIEW: '승인 대기', APPROVED: '승인 완료', REJECTED: '반려', NEEDS_REVISION: '보완 필요', REMOVED: '삭제됨',
};
const hrStatusCls: Record<HrStatus, string> = {
  PENDING_REVIEW: 'pending', APPROVED: 'normal', REJECTED: 'blinded', NEEDS_REVISION: 'dismissed', REMOVED: 'dismissed',
};

interface CompanyTabProps {
  onPendingCountChange: (count: number) => void;
}

export default function CompanyTab({ onPendingCountChange }: CompanyTabProps) {
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

  const appliedHrFilters = useRef({ hrStatus: '', keyword: '' });
  const hrReqId = useRef(0);

  const fetchHrManagers = useCallback(async (page = 1) => {
    const reqId = ++hrReqId.current;
    const f = appliedHrFilters.current;
    setHrLoading(true);
    setHrError('');
    try {
      const res = await memberApi.getHrManagers({
        ...(f.hrStatus && { hrStatus: f.hrStatus as any }),
        ...(f.keyword && { keyword: f.keyword }),
        page, size: 20,
      });
      if (reqId !== hrReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      const { items, totalItems, totalPages, pendingCount } = res.data.data;
      setHrManagers(items);
      setHrTotalItems(totalItems);
      setHrTotalPages(totalPages);
      setHrPendingCount(pendingCount);
      onPendingCountChange(pendingCount);
      setHrPage(page);
    } catch (err: unknown) {
      if (reqId !== hrReqId.current) return;
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        setHrError(err.response?.data?.message || (status ? `기업 회원 목록을 불러오지 못했습니다. (${status})` : '네트워크 연결을 확인해주세요.'));
      } else setHrError(err instanceof Error ? err.message : '기업 회원 목록을 불러오지 못했습니다.');
    } finally {
      if (reqId === hrReqId.current) setHrLoading(false);
    }
  }, [onPendingCountChange]);

  useEffect(() => { fetchHrManagers(1); }, [fetchHrManagers]);

  const applyHrSearch = () => {
    appliedHrFilters.current = { hrStatus: hrStatusFilter, keyword: companyKeyword };
    fetchHrManagers(1);
  };

  const openCompanyDetail = async (item: HrManagerItem) => {
    try {
      const res = await memberApi.getHrManagerDetail(item.memberId);
      if (!res.data.success) throw new Error(res.data.message);
      setSelectedCompany(res.data.data);
    } catch {
      setSelectedCompany({ ...item, rejectReason: null });
    }
  };

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
          <div className="memberKpiContent"><p>전체 기업회원</p><h3>{hrTotalItems}</h3><span>가입 신청 누계</span></div>
          <div className="memberKpiIcon kpi-blue"><Building2 size={26} /></div>
        </article>
        <article className="memberSummaryCard kpi-yellow">
          <div className="memberKpiContent"><p>승인 대기</p><h3>{hrPendingCount}</h3><span>재직증명서 검토 필요</span></div>
          <div className="memberKpiIcon kpi-yellow"><Clock size={26} /></div>
        </article>
        <article className="memberSummaryCard kpi-green">
          <div className="memberKpiContent"><p>승인 완료</p><h3>{hrManagers.filter((c) => c.hrStatus === 'APPROVED').length}</h3><span>현재 페이지 기준</span></div>
          <div className="memberKpiIcon kpi-green"><CheckCircle size={26} /></div>
        </article>
        <article className="memberSummaryCard kpi-yellow" style={{ background: 'linear-gradient(135deg, #fde8e8 0%, #fef2f2 100%)', borderColor: '#f0b8b8' }}>
          <div className="memberKpiContent">
            <p style={{ color: '#8a2020' }}>반려</p>
            <h3 style={{ color: '#5e1010' }}>{hrManagers.filter((c) => c.hrStatus === 'REJECTED').length}</h3>
            <span style={{ color: '#9e3030' }}>현재 페이지 기준</span>
          </div>
          <div className="memberKpiIcon kpi-yellow" style={{ background: 'rgba(178, 58, 58, 0.16)', color: '#8a2020' }}><XCircle size={26} /></div>
        </article>
      </section>

      <section className="admin-card memberFilter">
        <input type="text" placeholder="담당자명, 기업명, 이메일 검색" value={companyKeyword}
          onChange={(e) => setCompanyKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyHrSearch()} />
        <select value={hrStatusFilter} onChange={(e) => setHrStatusFilter(e.target.value)}>
          <option value="">전체</option>
          <option value="PENDING_REVIEW">승인 대기</option>
          <option value="APPROVED">승인 완료</option>
          <option value="REJECTED">반려</option>
          <option value="NEEDS_REVISION">보완 필요</option>
          <option value="REMOVED">삭제됨</option>
        </select>
        <button className="memberFilterBtn" onClick={applyHrSearch}>검색</button>
      </section>

      <section className="admin-card memberTableCard">
        <div className="memberTableHeader">
          <h3>기업회원 가입 신청 목록 <span className="memberTotalCount">전체 {hrTotalItems}건</span></h3>
        </div>
        {hrError && <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{hrError}</p>}
        <div className="tableScroll">
          <table className="memberTable">
            <thead>
              <tr>
                <th>회원 ID</th><th>HR 담당자명</th><th>이메일</th><th>기업명</th>
                <th>사업자등록번호</th><th>재직증명서</th><th>가입일</th><th>승인 상태</th><th>관리</th>
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
                  <td><span className={`statusBadge ${hrStatusCls[c.hrStatus]}`}>{hrStatusLabel[c.hrStatus]}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="tableBtn" onClick={() => openCompanyDetail(c)}>상세보기</button>
                      {c.hrStatus === 'PENDING_REVIEW' && (
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

      {selectedCompany && (
        <CompanyDetailModal
          company={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          onApprove={(c) => { setSelectedCompany(null); setApproveTarget(c); }}
          onReject={(c) => { setSelectedCompany(null); setRejectTarget(c); }}
        />
      )}
      {approveTarget && (
        <ApproveModal target={approveTarget} onClose={() => setApproveTarget(null)} onSuccess={() => fetchHrManagers(hrPage)} />
      )}
      {rejectTarget && (
        <RejectModal target={rejectTarget} onClose={() => setRejectTarget(null)} onSuccess={() => fetchHrManagers(hrPage)} />
      )}
    </div>
  );
}
