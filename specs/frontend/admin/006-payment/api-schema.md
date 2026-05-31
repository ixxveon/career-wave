# API Schema: 결제·정산 관리 (Payment & Settlement)

> 백엔드 ↔ 프론트엔드 간 데이터 계약.
> 모든 HTTP 호출은 `frontend/src/admin/api/paymentApi.ts`를 통해서만 수행한다.

---

## Enums

```ts
type PayStatus     = 'PENDING' | 'DONE' | 'CANCELED' | 'FAILED';
type RefundStatus  = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REJECTED';
type PaymentType   = 'MANUAL' | 'AUTO_RENEWAL';
type SubStatus     = 'ACTIVE' | 'RENEWAL_SCHEDULED' | 'CANCEL_SCHEDULED' | 'AT_RISK';
```

---

## Interfaces

```ts
interface AiUsage {
  resumePaidCount: number;    // 이력서 분석 유료 이용 횟수
  interviewPaidCount: number; // AI 면접 유료 이용 횟수
}

interface Payment {
  paymentId: string;          // UUID
  orderId: string;            // Toss 주문번호
  memberName: string;
  product: string;            // 상품명
  paidAt: string;             // 결제일 (ISO 8601)
  amount: number;
  paymentStatus: PayStatus;
  paymentType: PaymentType;
  aiUsage: AiUsage;
  refundStatus?: RefundStatus; // 환불 요청 건만 존재
}

interface PaymentSummary {
  totalRevenue: number;       // 이번달 총 매출 (DONE 합산)
  paidCount: number;          // 결제 건수 (DONE)
  refundPendingCount: number; // 환불 요청 수 (PENDING)
  failedCount: number;        // 결제 실패 수 (FAILED)
}

interface Subscription {
  subscriptionId: string;
  memberName: string;
  plan: string;
  startDate: string;
  renewDate: string;
  subStatus: SubStatus;
}

interface PageInfo {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}
```

---

## API 목록

### KPI 집계

```
GET /api/admin/payments/summary
응답: ApiResponse<PaymentSummary>
```

**응답 예시**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "totalRevenue": 203000,
    "paidCount": 7,
    "refundPendingCount": 2,
    "failedCount": 2
  }
}
```

---

### 결제 목록 조회

```
GET /api/admin/payments?keyword=&status=&page=1&size=20
응답: ApiResponse<{ items: Payment[]; page: number; size: number; totalItems: number; totalPages: number }>
```

**Query Parameters**:
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `keyword` | string | 결제 ID / Toss 주문번호 / 회원명 검색 |
| `status` | PayStatus | 상태 필터 (미입력 시 전체) |
| `page` | int | 페이지 번호 (1-based, default: 1) |
| `size` | int | 페이지 크기 (default: 20) |

---

### 결제 상세 조회

```
GET /api/admin/payments/{paymentId}
응답: ApiResponse<Payment>
```

> aiUsage 포함 — 환불 가능 여부 판단에 사용

---

### 환불 처리 확정

```
POST /api/admin/payments/{paymentId}/refund
응답: ApiResponse<{ paymentId: string; paymentStatus: PayStatus; refundStatus: RefundStatus }>
```

> 성공 시 paymentStatus → CANCELED, refundStatus → COMPLETED

---

### 환불 불가 처리

```
POST /api/admin/payments/{paymentId}/refund-reject
응답: ApiResponse<{ paymentId: string; paymentStatus: PayStatus; refundStatus: RefundStatus }>
```

> 성공 시 paymentStatus 유지(DONE), refundStatus → REJECTED

---

### 구독 현황 목록 조회

```
GET /api/admin/subscriptions?status=&page=1&size=20
응답: ApiResponse<{ items: Subscription[]; page: number; size: number; totalItems: number; totalPages: number }>
```

**Query Parameters**:
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `status` | SubStatus | 상태 필터 (미입력 시 전체) |
| `page` | int | 페이지 번호 (1-based) |
| `size` | int | 페이지 크기 |

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `PAYMENT_NOT_FOUND` | 404 | 결제 건 조회 실패 |
| `REFUND_NOT_PENDING` | 409 | 이미 처리된 환불 건 재처리 시도 |
| `REFUND_NOT_ELIGIBLE` | 400 | 환불 조건 미충족 건 확정 시도 |
| `SUBSCRIPTION_NOT_FOUND` | 404 | 구독 건 조회 실패 |
| `UNAUTHORIZED` | 401 | 인증 실패 |
