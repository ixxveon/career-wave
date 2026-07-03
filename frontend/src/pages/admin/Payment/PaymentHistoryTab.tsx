import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { CreditCard, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import {
  paymentApi,
  PAY_STATUS,
  PAY_STATUS_LABEL,
  REFUND_STATUS_LABEL,
  type Payment,
  type PaymentSummary,
  type PayStatus,
  type PaymentListParams,
} from '../../../api/admin/paymentApi';
import PaymentDetailModal from './PaymentDetailModal';

const PAY_STATUS_CLS: Record<string, string> = {
  PENDING: 'pending', DONE: 'normal', PAID: 'normal', CANCELED: 'dismissed', FAILED: 'blinded',
};
const REFUND_STATUS_CLS: Record<string, string> = {
  PENDING: 'pending', COMPLETED: 'dismissed', FAILED: 'blinded', REJECTED: 'blinded',
};

const isRefundPending = (p: Payment) => p.refundStatus === 'PENDING';

interface PaymentHistoryTabProps {
  isMaster: boolean;
  initialKeyword: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function PaymentHistoryTab({ isMaster, initialKeyword, showToast }: PaymentHistoryTabProps) {
  const [summary, setSummary] = useState<PaymentSummary>({ totalRevenue: 0, paidCount: 0, refundPendingCount: 0, failedCount: 0 });
  const summaryReqId = useRef(0);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [payTotalItems, setPayTotalItems] = useState(0);
  const [payPage, setPayPage] = useState(1);
  const [payTotalPages, setPayTotalPages] = useState(1);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const payReqId = useRef(0);

  const [keyword, setKeyword] = useState(initialKeyword);
  const [statusFilter, setStatusFilter] = useState('');
  const appliedPayFilters = useRef<PaymentListParams>(initialKeyword ? { keyword: initialKeyword } : {});

  const [selected, setSelected] = useState<Payment | null>(null);

  const fetchSummary = useCallback(async () => {
    const reqId = ++summaryReqId.current;
    try {
      const res = await paymentApi.getSummary();
      if (reqId !== summaryReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      setSummary(res.data.data);
    } catch (err) {
      console.error('fetchSummary failed:', err);
    }
  }, []);

  const fetchPayments = useCallback(async (page = 1) => {
    const reqId = ++payReqId.current;
    const f = appliedPayFilters.current;
    setPayLoading(true);
    setPayError('');
    try {
      const res = await paymentApi.getPayments({ ...f, page, size: 20 });
      if (reqId !== payReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      const { items, totalItems, totalPages } = res.data.data;
      setPayments(items);
      setPayTotalItems(totalItems);
      setPayTotalPages(totalPages);
      setPayPage(page);
    } catch (err: unknown) {
      if (reqId !== payReqId.current) return;
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (!axios.isAxiosError(err) && err instanceof Error && err.message) setPayError(err.message);
      else if (!status) setPayError('네트워크 연결을 확인해주세요.');
      else setPayError((axios.isAxiosError(err) && err.response?.data?.message) || `결제 목록을 불러오지 못했습니다. (${status})`);
    } finally {
      if (reqId === payReqId.current) setPayLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchPayments(1); }, [fetchPayments]);

  const applyPaySearch = () => {
    appliedPayFilters.current = {
      ...(keyword && { keyword }),
      ...(statusFilter && { status: statusFilter as PayStatus }),
    };
    fetchPayments(1);
  };

  const openDetail = async (p: Payment) => {
    setSelected(p);
    const targetId = p.paymentId;
    try {
      const res = await paymentApi.getPaymentDetail(targetId);
      if (!res.data.success) throw new Error(res.data.message);
      setSelected((cur) => cur?.paymentId === targetId ? res.data.data : cur);
    } catch {
    }
  };

  const handleRefundSuccess = (paymentId: string, update: Partial<Payment>) => {
    setPayments((prev) => prev.map((p) => p.paymentId === paymentId ? { ...p, ...update } : p));
    setSelected((cur) => cur?.paymentId === paymentId ? { ...cur, ...update } : cur);
    fetchSummary();
  };

  const renderPagination = (page: number, totalPages: number, loading: boolean, onPage: (p: number) => void) => (
    <div className="pagination">
      <button disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>{'<'}</button>
      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        const start = Math.min(Math.max(1, page - 2), Math.max(1, totalPages - 4));
        const p = start + i;
        if (p > totalPages) return null;
        return <button key={p} className={p === page ? 'activePage' : ''} disabled={loading} onClick={() => onPage(p)}>{p}</button>;
      })}
      <button disabled={loading || page >= totalPages} onClick={() => onPage(page + 1)}>{'>'}</button>
    </div>
  );

  return (
    <div className="memberPage">
      <div className="kpiGrid">
        <div className="kpiCard kpi-blue">
          <div className="kpiContent"><p>이번달 총 매출</p><h3>₩{summary.totalRevenue.toLocaleString()}</h3><span>결제 완료 기준</span></div>
          <div className="kpiIcon kpi-blue"><CreditCard size={24} /></div>
        </div>
        <div className="kpiCard kpi-green">
          <div className="kpiContent"><p>결제 건수</p><h3>{summary.paidCount}</h3><span>정상 처리</span></div>
          <div className="kpiIcon kpi-green"><CheckCircle2 size={24} /></div>
        </div>
        <div className="kpiCard kpi-yellow">
          <div className="kpiContent"><p>환불 요청</p><h3>{summary.refundPendingCount}</h3><span>처리 대기 중</span></div>
          <div className="kpiIcon kpi-yellow"><AlertCircle size={24} /></div>
        </div>
        <div className="kpiCard kpi-purple">
          <div className="kpiContent"><p>결제 실패</p><h3>{summary.failedCount}</h3><span>재시도 필요</span></div>
          <div className="kpiIcon kpi-purple"><XCircle size={24} /></div>
        </div>
      </div>

      <section className="admin-card memberFilter">
        <input type="text" placeholder="결제 ID, 주문번호, 회원명 검색" value={keyword}
          onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyPaySearch()} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">상태 전체</option>
          {(Object.entries(PAY_STATUS) as [PayStatus, PayStatus][]).map(([, v]) => (
            <option key={v} value={v}>{PAY_STATUS_LABEL[v]}</option>
          ))}
        </select>
        <button className="memberFilterBtn" onClick={applyPaySearch}>검색</button>
      </section>

      <section className="admin-card memberTableCard">
        <div className="memberTableHeader">
          <h3>결제 내역 <span className="payTotalCount">{payTotalItems}건</span></h3>
          <button>내역 내보내기</button>
        </div>
        {payError && <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{payError}</p>}
        <div className="tableScroll">
          <table className="memberTable">
            <thead>
              <tr><th>결제 ID</th><th>Toss 주문번호</th><th>회원명</th><th>상품명</th><th>유형</th><th>결제일</th><th>금액</th><th>상태</th><th>관리</th></tr>
            </thead>
            <tbody>
              {payLoading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 32, color: '#7a8da4' }}>불러오는 중...</td></tr>
              ) : payments.map((p) => (
                <tr key={p.paymentId}>
                  <td
                    style={{ fontSize: 13, color: '#7a8da4', fontFamily: 'monospace', cursor: 'pointer', userSelect: 'none' }}
                    title={`클릭하여 복사: ${p.paymentId}`}
                    onClick={() => { navigator.clipboard.writeText(p.paymentId).then(() => showToast('결제 ID가 복사되었습니다.')).catch(() => showToast('복사에 실패했습니다.', 'error')); }}
                  >
                    {p.paymentId.slice(0, 8)}…
                  </td>
                  <td className="payOrderId">{p.orderId}</td>
                  <td>{p.memberName}</td>
                  <td>{p.planName}</td>
                  <td>—</td>
                  <td>{p.approvedAt ? new Date(p.approvedAt).toLocaleDateString('ko-KR') : '—'}</td>
                  <td>₩{p.amount.toLocaleString()}</td>
                  <td>
                    {p.refundStatus ? (
                      <span className={`statusBadge ${REFUND_STATUS_CLS[p.refundStatus]}`}>{REFUND_STATUS_LABEL[p.refundStatus]}</span>
                    ) : (
                      <span className={`statusBadge ${PAY_STATUS_CLS[p.paymentStatus]}`}>{PAY_STATUS_LABEL[p.paymentStatus]}</span>
                    )}
                  </td>
                  <td>
                    <button className={`tableBtn${isRefundPending(p) ? ' tableBtn--refund' : ''}`} onClick={() => openDetail(p)}>
                      {isRefundPending(p) ? '환불 처리' : '상세보기'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="memberTableFooter">
          <span className="memberTableCount">
            {payTotalItems === 0 ? '총 0건' : `표시 중: ${(payPage - 1) * 20 + 1} - ${Math.min(payPage * 20, payTotalItems)} / 총 ${payTotalItems}건`}
          </span>
          {renderPagination(payPage, payTotalPages, payLoading, fetchPayments)}
        </div>
      </section>

      {selected && (
        <PaymentDetailModal
          selected={selected}
          isMaster={isMaster}
          showToast={showToast}
          onClose={() => setSelected(null)}
          onRefundSuccess={handleRefundSuccess}
        />
      )}
    </div>
  );
}
