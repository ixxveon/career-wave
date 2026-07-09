/** @vitest-environment jsdom */
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PaymentDetailModal from './PaymentDetailModal';
import type { Payment } from '../../../api/admin/paymentApi';

afterEach(() => {
  cleanup();
});

// 목록(list) 응답에는 aiUsage 필드가 없다 — 상세 조회 전 목록 데이터로 먼저 모달이
// 렌더링될 때 이 형태를 그대로 받는다 (#1169).
const listShapedPendingRefund: Payment = {
  paymentId: 'payment-1',
  orderId: 'order-1',
  memberName: '홍길동',
  planName: '프리미엄 월간',
  approvedAt: new Date().toISOString(),
  amount: 30000,
  paymentStatus: 'PAID',
  paymentType: 'MANUAL',
  refundStatus: 'PENDING',
};

describe('PaymentDetailModal — 환불 처리 진입 시 크래시 방지 (#1169)', () => {
  it('aiUsage가 없는 목록 데이터(refundStatus=PENDING)로도 렌더링 중 예외 없이 표시된다', () => {
    expect(() =>
      render(
        <PaymentDetailModal
          selected={listShapedPendingRefund}
          isMaster={true}
          showToast={vi.fn()}
          onClose={vi.fn()}
          onRefundSuccess={vi.fn()}
        />
      )
    ).not.toThrow();
  });
});
