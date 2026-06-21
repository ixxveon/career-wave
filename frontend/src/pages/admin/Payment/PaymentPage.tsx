import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Users,
  RefreshCw,
  Clock,
  AlertTriangle,
  Construction,
} from 'lucide-react';
import {
  paymentApi,
  PAY_STATUS,
  PAY_STATUS_LABEL,
  REFUND_STATUS_LABEL,
  SUB_STATUS,
  SUB_STATUS_LABEL,
  type Payment,
  type PaymentSummary,
  type Subscription,
  type PayStatus,
  type SubStatus,
  type PaymentListParams,
  type SubscriptionListParams,
  type SubscriptionCounts,
} from '../../../api/admin/paymentApi';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/Payment.css';

// ── 로컬 전용 타입 ────────────────────────────────────────────

type PayTab = '결제 내역' | '구독 현황' | '정산 리포트';

// ── CSS 클래스 맵 ─────────────────────────────────────────────

const PAY_STATUS_CLS: Record<string, string> = {
  PENDING:  'pending',
  DONE:     'normal',
  CANCELED: 'dismissed',
  FAILED:   'blinded',
};

const REFUND_STATUS_CLS: Record<string, string> = {
  PENDING:   'pending',
  COMPLETED: 'dismissed',
  FAILED:    'blinded',
  REJECTED:  'blinded',
};


const SUB_STATUS_CLS: Record<string, string> = {
  ACTIVE:            'normal',
  RENEWAL_SCHEDULED: 'answering',
  CANCEL_SCHEDULED:  'pending',
  AT_RISK:           'blinded',
};

const TABS: PayTab[] = ['결제 내역', '구독 현황', '정산 리포트'];

// ── 환불 가능 여부 판단 헬퍼 ──────────────────────────────────

function daysSincePaid(approvedAt: string): number {
  const paid = new Date(approvedAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  paid.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - paid.getTime()) / 86400000);
}

function checkRefundEligibility(p: Payment): { eligible: boolean; reason: string | null } {
  const days = daysSincePaid(p.approvedAt);
  if (days > 7) {
    return { eligible: false, reason: `결제일로부터 ${days}일 경과 — 환불 가능 기간(7일)을 초과하였습니다.` };
  }
  if (p.aiUsage.documentCount > 0 || p.aiUsage.interviewCount > 0) {
    return { eligible: false, reason: '유료 AI 기능 이용 이력이 있어 환불이 불가합니다.' };
  }
  return { eligible: true, reason: null };
}

const isRefundPending = (p: Payment) => p.refundStatus === 'PENDING';

// ── 에러 메시지 헬퍼 ──────────────────────────────────────────

function resolveErrorMsg(err: any, fallback: string, domain?: 'refund'): string {
  const status = err.response?.status;
  if (domain === 'refund') {
    if (status === 409) return '이미 처리된 환불 건입니다. (409)';
    if (status === 400) return '환불 조건을 충족하지 않는 건입니다. (400)';
    if (status === 404) return '결제 건을 찾을 수 없습니다. (404)';
  }
  if (!status) return '네트워크 연결을 확인해주세요.';
  return err.response?.data?.message || `${fallback} (${status})`;
}

// ── Toast ─────────────────────────────────────────────────────

interface Toast { id: number; msg: string; type: 'success' | 'error'; }

// ── Main Component ────────────────────────────────────────────

export default function PaymentPage() {
  const [tab, setTab] = useState<PayTab>('결제 내역');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current;
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  };

  // ── KPI 상태 ─────────────────────────────────────────────────
  const [summary, setSummary] = useState<PaymentSummary>({ totalRevenue: 0, paidCount: 0, refundPendingCount: 0, failedCount: 0 });
  const summaryReqId = useRef(0);

  // ── 결제 목록 상태 ────────────────────────────────────────────
  const [payments, setPayments]         = useState<Payment[]>([]);
  const [payTotalItems, setPayTotalItems] = useState(0);
  const [payPage, setPayPage]           = useState(1);
  const [payTotalPages, setPayTotalPages] = useState(1);
  const [payLoading, setPayLoading]     = useState(false);
  const [payError, setPayError]         = useState('');
  const payReqId = useRef(0);

  const [keyword, setKeyword]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const appliedPayFilters = useRef<PaymentListParams>({});

  // 결제 상세 / 환불 모달
  const [selected, setSelected]         = useState<Payment | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError]   = useState('');

  // ── 구독 현황 상태 ────────────────────────────────────────────
  const [subscriptions, setSubscriptions]   = useState<Subscription[]>([]);
  const [subTotalItems, setSubTotalItems]   = useState(0);
  const [subPage, setSubPage]               = useState(1);
  const [subTotalPages, setSubTotalPages]   = useState(1);
  const [subLoading, setSubLoading]         = useState(false);
  const [subError, setSubError]             = useState('');
  const subReqId = useRef(0);

  const [subStatusFilter, setSubStatusFilter] = useState('');
  const appliedSubFilters = useRef<SubscriptionListParams>({});

  // 구독 KPI (전용 집계 API)
  const [subCounts, setSubCounts] = useState<SubscriptionCounts | null>(null);

  // ── 구독 KPI 조회 ─────────────────────────────────────────────
  useEffect(() => {
    paymentApi.getSubscriptionCounts().then(res => {
      if (res.data.success) setSubCounts(res.data.data);
    }).catch(() => {});
  }, []);

  // ── KPI 조회 ──────────────────────────────────────────────────
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

  // ── 결제 목록 조회 ────────────────────────────────────────────
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
    } catch (err: any) {
      if (reqId !== payReqId.current) return;
      setPayError(resolveErrorMsg(err, '결제 목록을 불러오지 못했습니다.'));
    } finally {
      if (reqId === payReqId.current) setPayLoading(false);
    }
  }, []);

  const applyPaySearch = () => {
    appliedPayFilters.current = {
      ...(keyword && { keyword }),
      ...(statusFilter && { status: statusFilter as PayStatus }),
    };
    fetchPayments(1);
  };

  // ── 구독 목록 조회 ────────────────────────────────────────────
  const fetchSubscriptions = useCallback(async (page = 1) => {
    const reqId = ++subReqId.current;
    const f = appliedSubFilters.current;
    setSubLoading(true);
    setSubError('');
    try {
      const res = await paymentApi.getSubscriptions({ ...f, page, size: 20 });
      if (reqId !== subReqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      const { items, totalItems, totalPages } = res.data.data;
      setSubscriptions(items);
      setSubTotalItems(totalItems);
      setSubTotalPages(totalPages);
      setSubPage(page);
    } catch (err: any) {
      if (reqId !== subReqId.current) return;
      setSubError(resolveErrorMsg(err, '구독 목록을 불러오지 못했습니다.'));
    } finally {
      if (reqId === subReqId.current) setSubLoading(false);
    }
  }, []);

  const applySubSearch = () => {
    appliedSubFilters.current = {
      ...(subStatusFilter && { status: subStatusFilter as SubStatus }),
    };
    fetchSubscriptions(1);
  };

  useEffect(() => { fetchSummary(); }, [fetchSummary]);
  useEffect(() => { fetchPayments(1); }, [fetchPayments]);
  useEffect(() => { fetchSubscriptions(1); }, [fetchSubscriptions]);

  // ── 결제 상세 조회 (모달 열기) ────────────────────────────────
  const openDetail = async (p: Payment) => {
    setRefundError('');
    setSelected(p);
    const targetId = p.paymentId;
    try {
      const res = await paymentApi.getPaymentDetail(targetId);
      if (!res.data.success) throw new Error(res.data.message);
      // 응답 도착 시점에 다른 결제가 선택됐을 수 있으므로 paymentId 검증
      setSelected((cur) => cur?.paymentId === targetId ? res.data.data : cur);
    } catch {
      // 상세 조회 실패 시 목록 데이터로 fallback
    }
  };

  // ── 환불 처리 확정 ────────────────────────────────────────────
  const confirmRefund = async () => {
    if (!selected) return;
    setRefundLoading(true);
    setRefundError('');
    try {
      const res = await paymentApi.confirmRefund(selected.paymentId);
      if (!res.data.success) throw new Error(res.data.message);
      const { paymentStatus, refundStatus } = res.data.data;
      setPayments((prev) =>
        prev.map((p) => p.paymentId === selected.paymentId ? { ...p, paymentStatus, refundStatus } : p)
      );
      setSelected(null);
      fetchSummary();
      showToast('환불 처리가 완료되었습니다.');
    } catch (err: any) {
      setRefundError(resolveErrorMsg(err, '환불 처리에 실패했습니다.', 'refund'));
    } finally {
      setRefundLoading(false);
    }
  };

  // ── 환불 불가 처리 ────────────────────────────────────────────
  const rejectRefund = async () => {
    if (!selected) return;
    setRefundLoading(true);
    setRefundError('');
    try {
      const res = await paymentApi.rejectRefund(selected.paymentId);
      if (!res.data.success) throw new Error(res.data.message);
      const { paymentStatus, refundStatus } = res.data.data;
      setPayments((prev) =>
        prev.map((p) => p.paymentId === selected.paymentId ? { ...p, paymentStatus, refundStatus } : p)
      );
      setSelected(null);
      fetchSummary();
      showToast('환불 불가 처리가 완료되었습니다.');
    } catch (err: any) {
      setRefundError(resolveErrorMsg(err, '환불 불가 처리에 실패했습니다.', 'refund'));
    } finally {
      setRefundLoading(false);
    }
  };

  const refundCheck = selected?.refundStatus === 'PENDING' ? checkRefundEligibility(selected) : null;

  // ── 페이지네이션 렌더 헬퍼 ────────────────────────────────────
  const renderPagination = (page: number, totalPages: number, loading: boolean, onPage: (p: number) => void) => (
    <div className="pagination">
      <button disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>{'<'}</button>
      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
        const start = Math.min(Math.max(1, page - 2), Math.max(1, totalPages - 4));
        const p = start + i;
        if (p > totalPages) return null;
        return (
          <button key={p} className={p === page ? 'activePage' : ''} disabled={loading} onClick={() => onPage(p)}>
            {p}
          </button>
        );
      })}
      <button disabled={loading || page >= totalPages} onClick={() => onPage(page + 1)}>{'>'}</button>
    </div>
  );

  return (
    <section>
      {/* Toast */}
      <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{
            padding: '10px 18px', borderRadius: 8, fontSize: 14, fontWeight: 500,
            background: t.type === 'success' ? '#2e7d5e' : '#9a4444', color: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}>{t.msg}</div>
        ))}
      </div>

      <header className="admin-header">
        <div>
          <h2>결제 · 정산</h2>
          <p>구독 결제 내역, 구독 현황, 정산 리포트를 관리합니다.</p>
        </div>
      </header>

      {/* 탭 바 */}
      <div className="csTabBar" style={{ marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t} className={`csTab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab 1: 결제 내역 ──────────────────────────────────── */}
      {tab === '결제 내역' && (
        <div className="memberPage">
          {/* KPI */}
          <div className="kpiGrid">
            <div className="kpiCard kpi-blue">
              <div className="kpiContent">
                <p>이번달 총 매출</p>
                <h3>₩{summary.totalRevenue.toLocaleString()}</h3>
                <span>결제 완료 기준</span>
              </div>
              <div className="kpiIcon kpi-blue"><CreditCard size={24} /></div>
            </div>
            <div className="kpiCard kpi-green">
              <div className="kpiContent">
                <p>결제 건수</p>
                <h3>{summary.paidCount}</h3>
                <span>정상 처리</span>
              </div>
              <div className="kpiIcon kpi-green"><CheckCircle2 size={24} /></div>
            </div>
            <div className="kpiCard kpi-yellow">
              <div className="kpiContent">
                <p>환불 요청</p>
                <h3>{summary.refundPendingCount}</h3>
                <span>처리 대기 중</span>
              </div>
              <div className="kpiIcon kpi-yellow"><AlertCircle size={24} /></div>
            </div>
            <div className="kpiCard kpi-purple">
              <div className="kpiContent">
                <p>결제 실패</p>
                <h3>{summary.failedCount}</h3>
                <span>재시도 필요</span>
              </div>
              <div className="kpiIcon kpi-purple"><XCircle size={24} /></div>
            </div>
          </div>

          {/* 필터 */}
          <section className="admin-card memberFilter">
            <input
              type="text"
              placeholder="결제 ID, 주문번호, 회원명 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyPaySearch()}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">상태 전체</option>
              {(Object.entries(PAY_STATUS) as [PayStatus, PayStatus][]).map(([, v]) => (
                <option key={v} value={v}>{PAY_STATUS_LABEL[v]}</option>
              ))}
            </select>
            <button className="memberFilterBtn" onClick={applyPaySearch}>검색</button>
          </section>

          {/* 테이블 */}
          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>결제 내역 <span className="payTotalCount">{payTotalItems}건</span></h3>
              <button>내역 내보내기</button>
            </div>
            {payError && <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{payError}</p>}
            <div className="tableScroll">
              <table className="memberTable">
                <thead>
                  <tr>
                    <th>결제 ID</th>
                    <th>Toss 주문번호</th>
                    <th>회원명</th>
                    <th>상품명</th>
                    <th>유형</th>
                    <th>결제일</th>
                    <th>금액</th>
                    <th>상태</th>
                    <th>관리</th>
                  </tr>
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
                          <span className={`statusBadge ${REFUND_STATUS_CLS[p.refundStatus]}`}>
                            {REFUND_STATUS_LABEL[p.refundStatus]}
                          </span>
                        ) : (
                          <span className={`statusBadge ${PAY_STATUS_CLS[p.paymentStatus]}`}>
                            {PAY_STATUS_LABEL[p.paymentStatus]}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className={`tableBtn${isRefundPending(p) ? ' tableBtn--refund' : ''}`}
                          onClick={() => openDetail(p)}
                        >
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
        </div>
      )}

      {/* ── Tab 2: 구독 현황 ──────────────────────────────────── */}
      {tab === '구독 현황' && (
        <div className="memberPage">
          {/* KPI */}
          <div className="kpiGrid">
            <div className="kpiCard kpi-green">
              <div className="kpiContent"><p>활성 구독</p><h3>{subCounts != null ? subCounts.active : '—'}</h3><span>정상 이용 중</span></div>
              <div className="kpiIcon kpi-green"><Users size={24} /></div>
            </div>
            <div className="kpiCard kpi-blue">
              <div className="kpiContent"><p>갱신 예정 (D-7)</p><h3>{subCounts != null ? subCounts.renewalScheduled : '—'}</h3><span>자동 갱신 대기</span></div>
              <div className="kpiIcon kpi-blue"><RefreshCw size={24} /></div>
            </div>
            <div className="kpiCard kpi-yellow">
              <div className="kpiContent"><p>취소 예정</p><h3>{subCounts != null ? subCounts.cancelScheduled : '—'}</h3><span>기간 만료 후 종료</span></div>
              <div className="kpiIcon kpi-yellow"><Clock size={24} /></div>
            </div>
            <div className="kpiCard kpi-purple">
              <div className="kpiContent"><p>이탈 위험</p><h3>{subCounts != null ? subCounts.atRisk : '—'}</h3><span>자동 갱신 결제 실패</span></div>
              <div className="kpiIcon kpi-purple"><AlertTriangle size={24} /></div>
            </div>
          </div>

          {/* 필터 */}
          <section className="admin-card memberFilter">
            <select value={subStatusFilter} onChange={(e) => setSubStatusFilter(e.target.value)}>
              <option value="">상태 전체</option>
              {(Object.entries(SUB_STATUS) as [SubStatus, SubStatus][]).map(([, v]) => (
                <option key={v} value={v}>{SUB_STATUS_LABEL[v]}</option>
              ))}
            </select>
            <button className="memberFilterBtn" onClick={applySubSearch}>검색</button>
          </section>

          {/* 테이블 */}
          <section className="admin-card memberTableCard">
            <div className="memberTableHeader">
              <h3>구독 현황 <span className="payTotalCount">{subTotalItems}건</span></h3>
              <button>내보내기</button>
            </div>
            {subError && <p style={{ padding: '12px 16px', color: '#9a4444', fontSize: 14 }}>{subError}</p>}
            <div className="tableScroll">
              <table className="memberTable">
                <thead>
                  <tr>
                    <th>구독 ID</th>
                    <th>회원명</th>
                    <th>구독 플랜</th>
                    <th>시작일</th>
                    <th>다음 갱신일</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {subLoading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#7a8da4' }}>불러오는 중...</td></tr>
                  ) : subscriptions.map((s) => (
                    <tr key={s.subscriptionId}>
                      <td
                        style={{ fontSize: 13, color: '#7a8da4', fontFamily: 'monospace', cursor: 'pointer', userSelect: 'none' }}
                        title={`클릭하여 복사: ${s.subscriptionId}`}
                        onClick={() => { navigator.clipboard.writeText(s.subscriptionId); showToast('구독 ID가 복사되었습니다.'); }}
                      >
                        {s.subscriptionId.slice(0, 8)}…
                      </td>
                      <td>{s.memberName}</td>
                      <td>{s.planName}</td>
                      <td>{new Date(s.startedAt).toLocaleDateString('ko-KR')}</td>
                      <td>{new Date(s.currentPeriodEnd).toLocaleDateString('ko-KR')}</td>
                      <td>
                        <span className={`statusBadge ${SUB_STATUS_CLS[s.subscriptionStatus]}`}>
                          {SUB_STATUS_LABEL[s.subscriptionStatus]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="memberTableFooter">
              <span className="memberTableCount">
                {subTotalItems === 0 ? '총 0건' : `표시 중: ${(subPage - 1) * 20 + 1} - ${Math.min(subPage * 20, subTotalItems)} / 총 ${subTotalItems}건`}
              </span>
              {renderPagination(subPage, subTotalPages, subLoading, fetchSubscriptions)}
            </div>
          </section>
        </div>
      )}

      {/* ── Tab 3: 정산 리포트 (v2 예정) ─────────────────────── */}
      {tab === '정산 리포트' && (
        <div className="memberPage">
          <div className="payV2Blind">
            <div className="payV2BlindInner">
              <div className="payV2IconWrap"><Construction size={40} /></div>
              <h3 className="payV2Title">정산 리포트</h3>
              <p className="payV2Msg">다음 버전에 구현 될 예정입니다.</p>
              <span className="payV2Sub">
                현재 해당 기능은 준비 중입니다.<br />
                v2 업데이트 시 제공될 예정입니다.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── 결제 상세 / 환불 처리 모달 ───────────────────────── */}
      {selected && (
        <div className="modalOverlay" onClick={() => setSelected(null)}>
          <div className="memberModal modal--scrollable" style={{ width: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader" style={{ flexShrink: 0, padding: '20px 24px 16px' }}>
              <div>
                <h3>{selected.memberName} · <span
                  style={{ fontFamily: 'monospace', fontSize: 14, cursor: 'pointer', userSelect: 'none' }}
                  title={`클릭하여 복사: ${selected.paymentId}`}
                  onClick={() => { navigator.clipboard.writeText(selected.paymentId).then(() => showToast('결제 ID가 복사되었습니다.')).catch(() => showToast('복사에 실패했습니다.', 'error')); }}
                >{selected.paymentId.slice(0, 8)}…</span></h3>
                <p style={{ fontSize: 12, color: '#7a8da4', marginTop: 4 }}>
                  Toss 주문번호: {selected.orderId}
                </p>
              </div>
              <button onClick={() => setSelected(null)}>닫기</button>
            </div>

            <div className="modalBody">
              <div className="modalInfoGrid">
                <div><span>상품명</span><strong>{selected.planName}</strong></div>
                <div><span>결제일</span><strong>{selected.approvedAt ? new Date(selected.approvedAt).toLocaleDateString('ko-KR') : '—'}</strong></div>
                <div><span>결제 금액</span><strong>₩{selected.amount.toLocaleString()}</strong></div>
                <div><span>결제 수단</span><strong>{selected.paymentMethod ?? '—'}</strong></div>
                <div>
                  <span>현재 상태</span>
                  <span className={`statusBadge ${PAY_STATUS_CLS[selected.paymentStatus]}`}>
                    {PAY_STATUS_LABEL[selected.paymentStatus]}
                  </span>
                </div>
                {selected.refundStatus && (
                  <div>
                    <span>환불 상태</span>
                    <span className={`statusBadge ${REFUND_STATUS_CLS[selected.refundStatus]}`}>
                      {REFUND_STATUS_LABEL[selected.refundStatus]}
                    </span>
                  </div>
                )}
              </div>

              {/* 환불 요청 건 — 환불 가능 여부 확인 섹션 */}
              {selected.refundStatus === 'PENDING' && refundCheck && (() => {
                const elapsedDays = daysSincePaid(selected.approvedAt);
                return (
                <div className="refundCheckSection">
                  <p className="refundCheckTitle">환불 가능 여부 확인</p>
                  <div className="refundCheckRow">
                    <span>결제일로부터 경과</span>
                    <strong className={elapsedDays <= 7 ? 'refundOk' : 'refundFail'}>
                      {elapsedDays}일 경과
                      {elapsedDays <= 7 ? ' (7일 이내)' : ' (7일 초과)'}
                    </strong>
                  </div>
                  <div className="refundCheckRow">
                    <span>이력서 분석 유료 이용</span>
                    <strong className={selected.aiUsage.documentCount === 0 ? 'refundOk' : 'refundFail'}>
                      {selected.aiUsage.documentCount === 0 ? '없음' : `${selected.aiUsage.documentCount}회`}
                    </strong>
                  </div>
                  <div className="refundCheckRow">
                    <span>AI 면접 유료 이용</span>
                    <strong className={selected.aiUsage.interviewCount === 0 ? 'refundOk' : 'refundFail'}>
                      {selected.aiUsage.interviewCount === 0 ? '없음' : `${selected.aiUsage.interviewCount}회`}
                    </strong>
                  </div>
                  <div className="refundEligibleRow">
                    <span>환불 가능 여부</span>
                    <span className={`refundEligibleBadge ${refundCheck.eligible ? 'eligible' : 'ineligible'}`}>
                      {refundCheck.eligible ? '환불 가능' : '환불 불가'}
                    </span>
                  </div>
                  {!refundCheck.eligible && (
                    <p className="refundIneligibleNote">{refundCheck.reason}</p>
                  )}
                </div>
                );
              })()}

              {refundError && <p style={{ fontSize: 13, color: '#9a4444', marginTop: 12 }}>{refundError}</p>}
            </div>

            <div className="modalAction" style={{ flexShrink: 0, padding: '16px 24px 20px' }}>
              {selected.refundStatus === 'PENDING' && refundCheck?.eligible && (
                <button onClick={confirmRefund} disabled={refundLoading}>
                  {refundLoading ? '처리 중...' : '환불 처리 확정'}
                </button>
              )}
              {selected.refundStatus === 'PENDING' && refundCheck && !refundCheck.eligible && (
                <button className="tableBtn--danger" onClick={rejectRefund} disabled={refundLoading}>
                  {refundLoading ? '처리 중...' : '환불 불가 처리'}
                </button>
              )}
              <button onClick={() => setSelected(null)} disabled={refundLoading}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
