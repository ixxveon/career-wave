import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { X } from 'lucide-react';
import {
  settlementApi,
  SETTLEMENT_STATUS_LABEL,
  type SettlementListItem,
  type SettlementStatus,
} from '../../../api/admin/settlementApi';
import { ADMIN_ROUTE_PATHS } from '../../../constants/admin/adminRouteConstants';

const STATUS_BADGE_CLS: Record<SettlementStatus, string> = {
  PENDING: 'pending',
  CONFIRMED: 'normal',
};

interface SettlementTabProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function SettlementTab({ showToast }: SettlementTabProps) {
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState<SettlementListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const reqId = useRef(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);

  const fetchList = useCallback(async (p = 1) => {
    const rid = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const res = await settlementApi.getList({
        ...(statusFilter && { status: statusFilter }),
        page: p,
        size: 20,
      });
      if (rid !== reqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      const d = res.data.data;
      setSettlements(d.items);
      setTotalItems(d.totalItems);
      setTotalPages(d.totalPages);
      setPage(p);
    } catch (err: unknown) {
      if (rid !== reqId.current) return;
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('정산 목록을 불러오지 못했습니다.');
      }
    } finally {
      if (rid === reqId.current) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchList(1); }, [fetchList]);

  const handleGenerateSuccess = () => {
    setGenerateOpen(false);
    showToast('정산 리포트가 생성되었습니다.');
    fetchList(1);
  };

  const renderPagination = () => (
    <div className="pagination">
      <button disabled={loading || page <= 1} onClick={() => fetchList(page - 1)}>{'<'}</button>
      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        const start = Math.min(Math.max(1, page - 2), Math.max(1, totalPages - 4));
        const p = start + i;
        if (p > totalPages) return null;
        return <button key={p} className={p === page ? 'activePage' : ''} disabled={loading} onClick={() => fetchList(p)}>{p}</button>;
      })}
      <button disabled={loading || page >= totalPages} onClick={() => fetchList(page + 1)}>{'>'}</button>
    </div>
  );

  const formatAmount = (n: number) => `₩${n.toLocaleString('ko-KR')}`;
  const formatPeriod = (start: string, end: string) => `${start} ~ ${end}`;

  return (
    <div className="memberPage">
      <section className="admin-card memberFilter">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">상태 전체</option>
          <option value="PENDING">대기</option>
          <option value="CONFIRMED">확정</option>
        </select>
        <button className="memberFilterBtn" onClick={() => fetchList(1)}>검색</button>
      </section>

      <section className="admin-card memberTableCard">
        <div className="memberTableHeader">
          <h3>정산 리포트 <span className="payTotalCount">{totalItems}건</span></h3>
          <button className="memberFilterBtn" onClick={() => setGenerateOpen(true)}>정산 생성</button>
        </div>
        {error && <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{error}</p>}
        <div className="tableScroll">
          <table className="memberTable">
            <thead>
              <tr>
                <th>정산 기간</th>
                <th>총 매출</th>
                <th>총 환불</th>
                <th>순 매출</th>
                <th>거래 건수</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#7a8da4' }}>불러오는 중...</td></tr>
              ) : settlements.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#7a8da4' }}>정산 내역이 없습니다.</td></tr>
              ) : settlements.map((s) => (
                <tr key={s.settlementId} style={{ cursor: 'pointer' }} onClick={() => navigate(`${ADMIN_ROUTE_PATHS.settlements}/${s.settlementId}`)}>
                  <td>{formatPeriod(s.periodStart, s.periodEnd)}</td>
                  <td>{formatAmount(s.totalSalesAmount)}</td>
                  <td>{formatAmount(s.totalRefundAmount)}</td>
                  <td>{formatAmount(s.netSalesAmount)}</td>
                  <td>{s.totalTransactionCount}건</td>
                  <td>
                    <span className={`statusBadge ${STATUS_BADGE_CLS[s.settlementStatus]}`}>
                      {SETTLEMENT_STATUS_LABEL[s.settlementStatus]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="memberTableFooter">
          <span className="memberTableCount">
            {totalItems === 0 ? '총 0건' : `표시 중: ${(page - 1) * 20 + 1} - ${Math.min(page * 20, totalItems)} / 총 ${totalItems}건`}
          </span>
          {renderPagination()}
        </div>
      </section>

      {generateOpen && (
        <GenerateModal
          onClose={() => setGenerateOpen(false)}
          onSuccess={handleGenerateSuccess}
        />
      )}
    </div>
  );
}

interface GenerateModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function GenerateModal({ onClose, onSuccess }: GenerateModalProps) {
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState('');

  const isValid = periodStart && periodEnd && periodStart < periodEnd;

  const handleGenerate = async () => {
    if (!isValid) return;
    setGenLoading(true);
    setGenError('');
    try {
      const res = await settlementApi.generate({ periodStart, periodEnd });
      if (!res.data.success) throw new Error(res.data.message);
      onSuccess();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const msg = err.response?.data?.message;
        if (status === 409) {
          setGenError(msg || '이미 확정된 정산이 존재합니다.');
        } else if (status === 400) {
          setGenError(msg || '유효하지 않은 기간입니다.');
        } else {
          setGenError(msg || '정산 생성에 실패했습니다.');
        }
      } else if (err instanceof Error) {
        setGenError(err.message);
      } else {
        setGenError('정산 생성에 실패했습니다.');
      }
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="memberModal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h3>정산 리포트 생성</h3>
            <p style={{ fontSize: 12, color: '#7a8da4', marginTop: 4 }}>정산 기간을 입력하세요.</p>
          </div>
          <button className="modalCloseBtn" aria-label="닫기" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modalBody">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a4d63' }}>
              시작일
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', fontSize: 14, borderRadius: 6, border: '1px solid #d0d7de', boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a4d63' }}>
              종료일
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
                style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', fontSize: 14, borderRadius: 6, border: '1px solid #d0d7de', boxSizing: 'border-box' }} />
            </label>
            {periodStart && periodEnd && periodStart >= periodEnd && (
              <p style={{ fontSize: 13, color: '#9a4444' }}>시작일은 종료일보다 이전이어야 합니다.</p>
            )}
          </div>
          {genError && <p style={{ fontSize: 13, color: '#9a4444', marginTop: 12 }}>{genError}</p>}
        </div>
        <div className="modalAction">
          <button onClick={onClose} disabled={genLoading}>취소</button>
          <button onClick={handleGenerate} disabled={genLoading || !isValid}>
            {genLoading ? '생성 중...' : '생성'}
          </button>
        </div>
      </div>
    </div>
  );
}
