# Tasks: 결제·정산 관리 (Payment & Settlement)

> `plan.md`의 Phase와 1:1 대응한다.
> UI 구현 완료 항목은 ✅, API 연동 예정 항목은 [ ] 표시.

---

## Phase 1~4 — UI 구현 ✅ 완료

### 타입 / 상수

```ts
// frontend/src/admin/pages/Payment/PaymentPage.tsx 상단에 선언

type PayStatus    = 'PENDING' | 'DONE' | 'CANCELED' | 'FAILED';
type RefundStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REJECTED';
type PaymentType  = 'MANUAL' | 'AUTO_RENEWAL';
type SubStatus    = 'ACTIVE' | 'RENEWAL_SCHEDULED' | 'CANCEL_SCHEDULED' | 'AT_RISK';

const payStatusLabel: Record<PayStatus, string> = {
  PENDING:  '결제 대기',
  DONE:     '결제 완료',
  CANCELED: '환불 완료',
  FAILED:   '결제 실패',
};

const refundStatusLabel: Record<RefundStatus, string> = {
  PENDING:   '환불 요청',
  COMPLETED: '환불 완료',
  FAILED:    '환불 실패',
  REJECTED:  '환불 불가',
};

const paymentTypeLabel: Record<PaymentType, string> = {
  MANUAL:       '직접 결제',
  AUTO_RENEWAL: '자동 갱신',
};

const subStatusLabel: Record<SubStatus, string> = {
  ACTIVE:            '활성',
  RENEWAL_SCHEDULED: '갱신예정',
  CANCEL_SCHEDULED:  '취소예정',
  AT_RISK:           '이탈위험',
};
```

### 인터페이스

```ts
interface AiUsage {
  resumePaidCount: number;
  interviewPaidCount: number;
}

interface Payment {
  paymentId: string;         // API 연동 시 id → paymentId로 교체
  orderId: string;
  memberName: string;
  product: string;
  paidAt: string;
  amount: number;
  paymentStatus: PayStatus;
  paymentType: PaymentType;
  aiUsage: AiUsage;
  refundStatus?: RefundStatus;
}

interface Subscription {
  subscriptionId: string;
  memberName: string;
  plan: string;
  startDate: string;
  renewDate: string;
  subStatus: SubStatus;
}
```

### 환불 가능 여부 헬퍼

```ts
function daysSincePaid(paidAt: string): number { ... }

function checkRefundEligibility(p: Payment): {
  eligible: boolean;
  reason: string | null;
} {
  // 7일 초과 → 불가
  // aiUsage.resumePaidCount > 0 || aiUsage.interviewPaidCount > 0 → 불가
  // 둘 다 아니면 → 가능
}

const isRefundPending = (p: Payment) => p.refundStatus === 'PENDING';
```

---

## Phase 5 — API 연동

### paymentApi.ts 작성

```ts
// frontend/src/admin/api/paymentApi.ts
import axiosInstance from '@/utils/axiosInstance';

// KPI — 반환: ApiResponse<PaymentSummary>.data
export const fetchPaymentSummary = (): Promise<PaymentSummary> =>
  axiosInstance.get('/api/admin/payments/summary').then(r => r.data.data);

// 결제 목록 — 반환: ApiResponse<PageResult<Payment>>.data
export const fetchPayments = (params: {
  keyword?: string;
  status?: string;
  product?: string;
  page: number;
  size: number;
}): Promise<{ items: Payment[]; page: number; size: number; totalItems: number; totalPages: number }> =>
  axiosInstance.get('/api/admin/payments', { params }).then(r => r.data.data);

// 결제 상세 — 반환: ApiResponse<Payment>.data
export const fetchPaymentDetail = (paymentId: string): Promise<Payment> =>
  axiosInstance.get(`/api/admin/payments/${paymentId}`).then(r => r.data.data);

// 환불 처리 확정 — 반환: ApiResponse<{ paymentStatus, refundStatus }>.data
export const confirmRefund = (paymentId: string) =>
  axiosInstance.post(`/api/admin/payments/${paymentId}/refund`).then(r => r.data.data);

// 환불 불가 처리 — 반환: ApiResponse<{ paymentStatus, refundStatus }>.data
export const rejectRefund = (paymentId: string) =>
  axiosInstance.post(`/api/admin/payments/${paymentId}/refund-reject`).then(r => r.data.data);

// 구독 현황 목록 — 반환: ApiResponse<PageResult<Subscription>>.data
export const fetchSubscriptions = (params: {
  status?: string;
  page: number;
  size: number;
}): Promise<{ items: Subscription[]; page: number; size: number; totalItems: number; totalPages: number }> =>
  axiosInstance.get('/api/admin/subscriptions', { params }).then(r => r.data.data);
```

### API 연동 체크리스트

- [ ] `paymentApi.ts` 파일 작성
- [ ] KPI 집계 API 연동 및 더미 데이터 제거 (`GET /api/admin/payments/summary`)
- [ ] 결제 목록 API 연동 및 더미 데이터 제거 (`GET /api/admin/payments`)
- [ ] keyword / status / product 필터 쿼리 파라미터 연결
- [ ] 결제 목록 페이지네이션 연결 (page, size)
- [ ] 결제 상세 API 연동 (`GET /api/admin/payments/{paymentId}`)
- [ ] 환불 처리 확정 API 연동 (`POST /api/admin/payments/{paymentId}/refund`)
- [ ] 환불 불가 처리 API 연동 (`POST /api/admin/payments/{paymentId}/refund-reject`)
- [ ] 환불 처리 성공 후 목록 상태 배지 즉시 갱신 (서버 응답 기준)
- [ ] 구독 현황 목록 API 연동 및 더미 데이터 제거 (`GET /api/admin/subscriptions`)
- [ ] 구독 상태 필터 쿼리 파라미터 연결
- [ ] 구독 목록 페이지네이션 연결 (page, size)
- [ ] `ApiResponse<T>` 형식 기반 성공·실패 처리
- [ ] API 실패 시 에러 메시지 표시 (`ApiResponse.message` 활용)
- [ ] 서버 409 응답 (`REFUND_NOT_PENDING`) 처리
- [ ] API 호출 중 로딩 상태(스피너) 표시
- [ ] API 성공 시 토스트 메시지 표시
