import { useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import {
  paymentApi,
  PAY_STATUS,
  PAY_STATUS_LABEL,
  REFUND_STATUS_LABEL,
  type Payment,
} from '../../../api/admin/paymentApi';

const PAY_STATUS_CLS: Record<string, string> = {
  PENDING: 'pending', DONE: 'normal', PAID: 'normal', CANCELED: 'dismissed', FAILED: 'blinded',
};
const REFUND_STATUS_CLS: Record<string, string> = {
  PENDING: 'pending', COMPLETED: 'dismissed', FAILED: 'blinded', REJECTED: 'blinded',
};

function daysSincePaid(approvedAt: string): number {
  const paid = new Date(approvedAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  paid.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - paid.getTime()) / 86400000);
}

function checkRefundEligibility(p: Payment): { eligible: boolean; reason: string | null } {
  const days = daysSincePaid(p.approvedAt);
  if (days > 7) return { eligible: false, reason: `결제일로부터 ${days}일 경과 — 환불 가능 기간(7일)을 초과하였습니다.` };
  if (p.aiUsage.documentCount > 0 || p.aiUsage.interviewCount > 0) return { eligible: false, reason: '유료 AI 기능 이용 이력이 있어 환불이 불가합니다.' };
  return { eligible: true, reason: null };
}

function resolveErrorMsg(err: unknown, fallback: string, domain?: 'refund'): string {
  const status = axios.isAxiosError(err) ? err.response?.status : undefined;
  if (domain === 'refund') {
    if (status === 409) return '이미 처리된 환불 건입니다. (409)';
    if (status === 400) return '환불 조건을 충족하지 않는 건입니다. (400)';
    if (status === 404) return '결제 건을 찾을 수 없습니다. (404)';
  }
  if (!axios.isAxiosError(err) && err instanceof Error && err.message) return err.message;
  if (!status) return '네트워크 연결을 확인해주세요.';
  return (axios.isAxiosError(err) && err.response?.data?.message) || `${fallback} (${status})`;
}

interface PaymentDetailModalProps {
  selected: Payment;
  isMaster: boolean;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onClose: () => void;
  onRefundSuccess: (paymentId: string, update: Partial<Payment>) => void;
}

export default function PaymentDetailModal({ selected, isMaster, showToast, onClose, onRefundSuccess }: PaymentDetailModalProps) {
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestMode, setRequestMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const refundCheck = selected.refundStatus === 'PENDING' ? checkRefundEligibility(selected) : null;
  const isCompletedPayment = selected.paymentStatus === PAY_STATUS.PAID || selected.paymentStatus === PAY_STATUS.DONE;

  const submitRefundRequest = async () => {
    if (!requestReason.trim()) return;
    setRefundLoading(true);
    setRefundError('');
    try {
      const res = await paymentApi.requestRefund(selected.paymentId, requestReason.trim());
      if (!res.data.success) throw new Error(res.data.message);
      onRefundSuccess(selected.paymentId, { refundStatus: res.data.data.refundStatus });
      showToast('환불 요청이 접수되었습니다.');
    } catch (err: unknown) {
      setRefundError(resolveErrorMsg(err, '환불 요청 접수에 실패했습니다.', 'refund'));
    } finally {
      setRefundLoading(false);
    }
  };

  const confirmRefund = async () => {
    setRefundLoading(true);
    setRefundError('');
    try {
      const res = await paymentApi.confirmRefund(selected.paymentId);
      if (!res.data.success) throw new Error(res.data.message);
      onRefundSuccess(selected.paymentId, { paymentStatus: res.data.data.paymentStatus, refundStatus: res.data.data.refundStatus });
      onClose();
      showToast('환불 처리가 완료되었습니다.');
    } catch (err: unknown) {
      setRefundError(resolveErrorMsg(err, '환불 처리에 실패했습니다.', 'refund'));
    } finally {
      setRefundLoading(false);
    }
  };

  const rejectRefundAction = async () => {
    if (!rejectReason.trim()) return;
    setRefundLoading(true);
    setRefundError('');
    try {
      const res = await paymentApi.rejectRefund(selected.paymentId, rejectReason.trim());
      if (!res.data.success) throw new Error(res.data.message);
      onRefundSuccess(selected.paymentId, { paymentStatus: res.data.data.paymentStatus, refundStatus: res.data.data.refundStatus });
      onClose();
      showToast('환불 불가 처리가 완료되었습니다.');
    } catch (err: unknown) {
      setRefundError(resolveErrorMsg(err, '환불 불가 처리에 실패했습니다.', 'refund'));
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <div className="modalOverlay">
      <div className="memberModal modal--scrollable" style={{ width: 540 }} onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader" style={{ flexShrink: 0, padding: '20px 24px 16px' }}>
          <div>
            <h3>{selected.memberName} · <span
              style={{ fontFamily: 'monospace', fontSize: 14, cursor: 'pointer', userSelect: 'none' }}
              title={`클릭하여 복사: ${selected.paymentId}`}
              onClick={() => { navigator.clipboard.writeText(selected.paymentId).then(() => showToast('결제 ID가 복사되었습니다.')).catch(() => showToast('복사에 실패했습니다.', 'error')); }}
            >{selected.paymentId.slice(0, 8)}…</span></h3>
            <p style={{ fontSize: 12, color: '#7a8da4', marginTop: 4 }}>Toss 주문번호: {selected.orderId}</p>
          </div>
          <button className="modalCloseBtn" aria-label="닫기" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modalBody">
          <div className="modalInfoGrid">
            <div><span>상품명</span><strong>{selected.planName}</strong></div>
            <div><span>결제일</span><strong>{selected.approvedAt ? new Date(selected.approvedAt).toLocaleDateString('ko-KR') : '—'}</strong></div>
            <div><span>결제 금액</span><strong>₩{selected.amount.toLocaleString()}</strong></div>
            <div><span>결제 수단</span><strong>{selected.paymentMethod ?? '—'}</strong></div>
            <div>
              <span>현재 상태</span>
              <span className={`statusBadge ${PAY_STATUS_CLS[selected.paymentStatus]}`}>{PAY_STATUS_LABEL[selected.paymentStatus]}</span>
            </div>
            {selected.refundStatus && (
              <div>
                <span>환불 상태</span>
                <span className={`statusBadge ${REFUND_STATUS_CLS[selected.refundStatus]}`}>{REFUND_STATUS_LABEL[selected.refundStatus]}</span>
              </div>
            )}
          </div>

          {isCompletedPayment && !selected.refundStatus && (
            <div className="refundCheckSection">
              <p className="refundCheckTitle">환불 요청 접수</p>
              {requestMode ? (
                <textarea placeholder="환불 요청 사유를 입력하세요" value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)} rows={3}
                  style={{ width: '100%', resize: 'vertical', marginTop: 8, padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #d0d7de', boxSizing: 'border-box' }} />
              ) : (
                <p style={{ fontSize: 13, color: '#7a8da4', marginTop: 4 }}>결제 완료 건에 대해 환불 요청을 접수합니다.</p>
              )}
            </div>
          )}

          {selected.refundStatus === 'PENDING' && refundCheck && (() => {
            const elapsedDays = daysSincePaid(selected.approvedAt);
            return (
              <div className="refundCheckSection">
                <p className="refundCheckTitle">환불 가능 여부 확인</p>
                <div className="refundCheckRow">
                  <span>결제일로부터 경과</span>
                  <strong className={elapsedDays <= 7 ? 'refundOk' : 'refundFail'}>
                    {elapsedDays}일 경과{elapsedDays <= 7 ? ' (7일 이내)' : ' (7일 초과)'}
                  </strong>
                </div>
                <div className="refundCheckRow">
                  <span>이력서 분석 유료 이용</span>
                  <strong className={(selected.aiUsage?.documentCount ?? 0) === 0 ? 'refundOk' : 'refundFail'}>
                    {(selected.aiUsage?.documentCount ?? 0) === 0 ? '없음' : `${selected.aiUsage?.documentCount}회`}
                  </strong>
                </div>
                <div className="refundCheckRow">
                  <span>AI 면접 유료 이용</span>
                  <strong className={(selected.aiUsage?.interviewCount ?? 0) === 0 ? 'refundOk' : 'refundFail'}>
                    {(selected.aiUsage?.interviewCount ?? 0) === 0 ? '없음' : `${selected.aiUsage?.interviewCount}회`}
                  </strong>
                </div>
                <div className="refundEligibleRow">
                  <span>환불 가능 여부</span>
                  <span className={`refundEligibleBadge ${refundCheck.eligible ? 'eligible' : 'ineligible'}`}>
                    {refundCheck.eligible ? '환불 가능' : '환불 불가'}
                  </span>
                </div>
                {!refundCheck.eligible && <p className="refundIneligibleNote">{refundCheck.reason}</p>}
                {isMaster && !refundCheck.eligible && (
                  <textarea placeholder="환불 불가 사유를 입력하세요" value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)} rows={2}
                    style={{ width: '100%', resize: 'vertical', marginTop: 10, padding: '8px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #d0d7de', boxSizing: 'border-box' }} />
                )}
              </div>
            );
          })()}

          {refundError && <p style={{ fontSize: 13, color: '#9a4444', marginTop: 12 }}>{refundError}</p>}
        </div>

        <div className="modalAction" style={{ flexShrink: 0, padding: '16px 24px 20px' }}>
          {isCompletedPayment && !selected.refundStatus && !requestMode && (
            <button onClick={() => setRequestMode(true)} disabled={refundLoading}>환불 요청</button>
          )}
          {isCompletedPayment && !selected.refundStatus && requestMode && (
            <>
              <button onClick={submitRefundRequest} disabled={refundLoading || !requestReason.trim()}>
                {refundLoading ? '처리 중...' : '접수 확인'}
              </button>
              <button onClick={() => { setRequestMode(false); setRequestReason(''); }} disabled={refundLoading}>취소</button>
            </>
          )}
          {isMaster && selected.refundStatus === 'PENDING' && refundCheck?.eligible && (
            <button onClick={confirmRefund} disabled={refundLoading}>{refundLoading ? '처리 중...' : '환불 처리 확정'}</button>
          )}
          {isMaster && selected.refundStatus === 'PENDING' && refundCheck && !refundCheck.eligible && (
            <button className="tableBtn--danger" onClick={rejectRefundAction} disabled={refundLoading || !rejectReason.trim()}>
              {refundLoading ? '처리 중...' : '환불 불가 처리'}
            </button>
          )}
          <button onClick={onClose} disabled={refundLoading}>닫기</button>
        </div>
      </div>
    </div>
  );
}
