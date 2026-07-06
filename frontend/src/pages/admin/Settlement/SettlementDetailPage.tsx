import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  settlementApi,
  SETTLEMENT_STATUS_LABEL,
  SETTLEMENT_ITEM_TYPE_LABEL,
  type SettlementDetail,
  type SettlementStatus,
  type SettlementItemType,
} from '../../../api/admin/settlementApi';
import { ADMIN_ROUTE_PATHS } from '../../../constants/admin/adminRouteConstants';
import '../../../styles/admin/admin.css';
import '../../../styles/admin/UserManagement.css';

const STATUS_BADGE_CLS: Record<SettlementStatus, string> = {
  PENDING: 'pending',
  CONFIRMED: 'normal',
};

const ITEM_TYPE_BADGE_CLS: Record<SettlementItemType, string> = {
  PAYMENT: 'answering',
  REFUND: 'blinded',
};

// TODO: 백엔드 정산 API 배포 완료 후 제거 — 더미 데이터 (SettlementTab의 더미 목록과 동일 ID 체계)
const USE_DUMMY = true;
const DUMMY_DETAILS: Record<number, SettlementDetail> = {
  1: {
    settlementId: 1, periodStart: '2026-06-01', periodEnd: '2026-06-30',
    totalSalesAmount: 2450000, totalRefundAmount: 150000, netSalesAmount: 2300000,
    supplyAmount: 2090909, vatAmount: 209091,
    totalTransactionCount: 28, paidCount: 26, refundCount: 2,
    settlementStatus: 'CONFIRMED', settledAt: '2026-07-01T09:00:00', settledByName: '신보라', note: '6월 정산 확정',
    createdAt: '2026-07-01T00:00:00',
    items: [
      { settlementItemId: 1, paymentId: 'b1a2c3d4-e5f6-7890-1234-56789abcdef0', orderId: 'ORD-20260615-001', memberName: '김취준', planName: '프리미엄 3개월', amount: 89000, itemType: 'PAYMENT', paymentApprovedAt: '2026-06-15T10:00:00' },
      { settlementItemId: 2, paymentId: 'c2b3d4e5-f6a7-8901-2345-6789abcdef01', orderId: 'ORD-20260618-002', memberName: '이지원', planName: '베이직 1개월', amount: 29000, itemType: 'PAYMENT', paymentApprovedAt: '2026-06-18T14:30:00' },
      { settlementItemId: 3, paymentId: 'd3c4e5f6-a7b8-9012-3456-789abcdef012', orderId: 'ORD-20260610-003', memberName: '박서류', planName: '프리미엄 1개월', amount: 39000, itemType: 'REFUND', paymentApprovedAt: '2026-06-10T09:15:00' },
      { settlementItemId: 4, paymentId: 'e4d5f6a7-b8c9-0123-4567-89abcdef0123', orderId: 'ORD-20260622-004', memberName: '최면접', planName: '베이직 3개월', amount: 69000, itemType: 'PAYMENT', paymentApprovedAt: '2026-06-22T11:20:00' },
    ],
  },
  2: {
    settlementId: 2, periodStart: '2026-05-01', periodEnd: '2026-05-31',
    totalSalesAmount: 1980000, totalRefundAmount: 0, netSalesAmount: 1980000,
    supplyAmount: 1800000, vatAmount: 180000,
    totalTransactionCount: 22, paidCount: 22, refundCount: 0,
    settlementStatus: 'CONFIRMED', settledAt: '2026-06-01T09:00:00', settledByName: '신보라', note: null,
    createdAt: '2026-06-01T00:00:00',
    items: [
      { settlementItemId: 5, paymentId: 'f5e6a7b8-c9d0-1234-5678-9abcdef01234', orderId: 'ORD-20260512-005', memberName: '정합격', planName: '프리미엄 1개월', amount: 39000, itemType: 'PAYMENT', paymentApprovedAt: '2026-05-12T10:00:00' },
    ],
  },
  3: {
    settlementId: 3, periodStart: '2026-07-01', periodEnd: '2026-07-31',
    totalSalesAmount: 890000, totalRefundAmount: 50000, netSalesAmount: 840000,
    supplyAmount: 763636, vatAmount: 76364,
    totalTransactionCount: 12, paidCount: 11, refundCount: 1,
    settlementStatus: 'PENDING', settledAt: null, settledByName: null, note: null,
    createdAt: '2026-07-02T00:00:00',
    items: [
      { settlementItemId: 6, paymentId: 'a6b7c8d9-e0f1-2345-6789-abcdef012345', orderId: 'ORD-20260703-006', memberName: '한신입', planName: '베이직 1개월', amount: 29000, itemType: 'PAYMENT', paymentApprovedAt: '2026-07-03T13:00:00' },
    ],
  },
};

interface Toast { id: number; msg: string; type: 'success' | 'error'; }

export default function SettlementDetailPage() {
  const { settlementId } = useParams<{ settlementId: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<SettlementDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const reqId = useRef(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current;
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3000);
  };

  const fetchDetail = useCallback(async () => {
    if (!settlementId) return;
    if (USE_DUMMY) {
      const found = DUMMY_DETAILS[Number(settlementId)];
      if (!found) {
        setError('정산 리포트를 찾을 수 없습니다.');
        return;
      }
      setDetail(found);
      return;
    }
    const rid = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const res = await settlementApi.getDetail(Number(settlementId));
      if (rid !== reqId.current) return;
      if (!res.data.success) throw new Error(res.data.message);
      setDetail(res.data.data);
    } catch (err: unknown) {
      if (rid !== reqId.current) return;
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setError('정산 리포트를 찾을 수 없습니다.');
      } else if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('정산 상세를 불러오지 못했습니다.');
      }
    } finally {
      if (rid === reqId.current) setLoading(false);
    }
  }, [settlementId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleConfirmSuccess = () => {
    setConfirmOpen(false);
    showToast('정산이 확정되었습니다.');
    fetchDetail();
  };

  const goToList = () => navigate(`${ADMIN_ROUTE_PATHS.payments}?tab=settlement`);

  const formatAmount = (n: number) => `₩${n.toLocaleString('ko-KR')}`;

  if (loading) {
    return (
      <section>
        <header className="admin-header">
          <div><h2>정산 상세</h2><p>불러오는 중...</p></div>
        </header>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <header className="admin-header">
          <div><h2>정산 상세</h2><p style={{ color: '#9a4444' }}>{error}</p></div>
        </header>
        <div className="memberPage">
          <button className="memberFilterBtn" onClick={goToList}>목록으로</button>
        </div>
      </section>
    );
  }

  if (!detail) return null;

  const isPending = detail.settlementStatus === 'PENDING';

  return (
    <section>
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
          <h2>정산 상세</h2>
          <p>{detail.periodStart} ~ {detail.periodEnd}</p>
        </div>
      </header>

      <div className="memberPage">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className="memberFilterBtn" onClick={goToList}>목록으로</button>
          {isPending && (
            <button className="memberFilterBtn" style={{ background: '#2e7d5e' }} onClick={() => setConfirmOpen(true)}>정산 확정</button>
          )}
        </div>

        <section className="admin-card" style={{ padding: 22, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#3a4d63' }}>
            정산 요약
            <span className={`statusBadge ${STATUS_BADGE_CLS[detail.settlementStatus]}`} style={{ marginLeft: 8 }}>
              {SETTLEMENT_STATUS_LABEL[detail.settlementStatus]}
            </span>
          </h3>
          <div className="modalInfoGrid">
            <div><span>정산 기간</span><strong>{detail.periodStart} ~ {detail.periodEnd}</strong></div>
            <div><span>총 매출</span><strong>{formatAmount(detail.totalSalesAmount)}</strong></div>
            <div><span>총 환불</span><strong>{formatAmount(detail.totalRefundAmount)}</strong></div>
            <div><span>순 매출</span><strong>{formatAmount(detail.netSalesAmount)}</strong></div>
            <div><span>공급가액</span><strong>{formatAmount(detail.supplyAmount)}</strong></div>
            <div><span>부가세</span><strong>{formatAmount(detail.vatAmount)}</strong></div>
            <div><span>결제 건수</span><strong>{detail.paidCount}건</strong></div>
            <div><span>환불 건수</span><strong>{detail.refundCount}건</strong></div>
            {!isPending && (
              <>
                <div><span>확정자</span><strong>{detail.settledByName ?? '—'}</strong></div>
                <div><span>확정일</span><strong>{detail.settledAt ? new Date(detail.settledAt).toLocaleDateString('ko-KR') : '—'}</strong></div>
                {detail.note && (
                  <div style={{ gridColumn: '1 / -1' }}><span>메모</span><strong>{detail.note}</strong></div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="admin-card memberTableCard">
          <div className="memberTableHeader">
            <h3>포함 항목 <span className="payTotalCount">{detail.items.length}건</span></h3>
          </div>
          <div className="tableScroll">
            <table className="memberTable">
              <thead>
                <tr>
                  <th>결제 ID</th>
                  <th>주문번호</th>
                  <th>회원명</th>
                  <th>상품명</th>
                  <th>금액</th>
                  <th>유형</th>
                  <th>결제승인일</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: '#7a8da4' }}>포함된 항목이 없습니다.</td></tr>
                ) : detail.items.map((item) => (
                  <tr key={item.settlementItemId}>
                    <td style={{ fontSize: 13, color: '#7a8da4', fontFamily: 'monospace' }}>{item.paymentId.slice(0, 8)}...</td>
                    <td>{item.orderId}</td>
                    <td>{item.memberName}</td>
                    <td>{item.planName}</td>
                    <td>{formatAmount(item.amount)}</td>
                    <td>
                      <span className={`statusBadge ${ITEM_TYPE_BADGE_CLS[item.itemType]}`}>
                        {SETTLEMENT_ITEM_TYPE_LABEL[item.itemType]}
                      </span>
                    </td>
                    <td>{item.paymentApprovedAt ? new Date(item.paymentApprovedAt).toLocaleDateString('ko-KR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {confirmOpen && detail && (
        <ConfirmModal
          settlementId={detail.settlementId}
          periodLabel={`${detail.periodStart} ~ ${detail.periodEnd}`}
          onClose={() => setConfirmOpen(false)}
          onSuccess={handleConfirmSuccess}
        />
      )}
    </section>
  );
}

interface ConfirmModalProps {
  settlementId: number;
  periodLabel: string;
  onClose: () => void;
  onSuccess: () => void;
}

function ConfirmModal({ settlementId, periodLabel, onClose, onSuccess }: ConfirmModalProps) {
  const [note, setNote] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const handleConfirm = async () => {
    setConfirmLoading(true);
    setConfirmError('');
    try {
      const res = await settlementApi.confirm(settlementId, { ...(note.trim() && { note: note.trim() }) });
      if (!res.data.success) throw new Error(res.data.message);
      onSuccess();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const msg = err.response?.data?.message;
        if (status === 409) {
          setConfirmError(msg || '이미 확정된 정산입니다.');
        } else {
          setConfirmError(msg || '정산 확정에 실패했습니다.');
        }
      } else if (err instanceof Error) {
        setConfirmError(err.message);
      } else {
        setConfirmError('정산 확정에 실패했습니다.');
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="memberModal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <div>
            <h3>정산 확정</h3>
            <p style={{ fontSize: 12, color: '#7a8da4', marginTop: 4 }}>{periodLabel}</p>
          </div>
          <button onClick={onClose}>닫기</button>
        </div>
        <div className="modalBody">
          <p style={{ fontSize: 14, color: '#3a4d63', marginBottom: 16 }}>
            정산을 확정하시겠습니까? 확정 후 취소할 수 없습니다.
          </p>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#3a4d63' }}>
            메모 (선택)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="정산 확정 메모를 입력하세요"
              rows={3}
              style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', fontSize: 14, borderRadius: 6, border: '1px solid #d0d7de', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </label>
          {confirmError && <p style={{ fontSize: 13, color: '#9a4444', marginTop: 12 }}>{confirmError}</p>}
        </div>
        <div className="modalAction">
          <button onClick={onClose} disabled={confirmLoading}>취소</button>
          <button onClick={handleConfirm} disabled={confirmLoading}>
            {confirmLoading ? '확정 중...' : '확정'}
          </button>
        </div>
      </div>
    </div>
  );
}
