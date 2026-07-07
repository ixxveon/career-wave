# API Schema: 정산 관리 (Settlement)

> 백엔드 ↔ 프론트엔드 간 데이터 계약.
> 모든 HTTP 호출은 `frontend/src/api/admin/settlementApi.ts`를 통해서만 수행한다.

---

## Enums

```ts
type SettlementStatus = 'PENDING' | 'CONFIRMED';
type SettlementItemType = 'PAYMENT' | 'REFUND';
```

---

## Interfaces

```ts
interface SettlementListItem {
  settlementId: number;
  periodStart: string;        // "2026-06-01"
  periodEnd: string;          // "2026-06-30"
  totalSalesAmount: number;   // BIGINT → number (KRW 단위)
  totalRefundAmount: number;
  netSalesAmount: number;
  totalTransactionCount: number;
  settlementStatus: SettlementStatus;
  createdAt: string;          // ISO 8601
}

interface SettlementDetail extends SettlementListItem {
  supplyAmount: number;
  vatAmount: number;
  paidCount: number;
  refundCount: number;
  settledAt: string | null;
  settledByName: string | null;
  note: string | null;
  items: SettlementItemDetail[];
}

interface SettlementItemDetail {
  settlementItemId: number;
  paymentId: string;          // UUID
  orderId: string;
  memberName: string;
  planName: string;
  amount: number;
  itemType: SettlementItemType;
  paymentApprovedAt: string;  // ISO 8601
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

### 정산 리포트 목록 조회

```http
GET /api/v1/admin/settlements?status=&page=1&size=20
응답: ApiResponse<{ items: SettlementListItem[]; page; size; totalItems; totalPages }>
```

**Query Parameters**:

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `status` | `SettlementStatus` | N | 상태 필터 (미입력 시 전체) |
| `page` | `int` | N | 1-based (기본값 1) |
| `size` | `int` | N | 최대 100 (기본값 20) |

---

### 정산 리포트 상세 조회

```http
GET /api/v1/admin/settlements/{settlementId}
응답: ApiResponse<SettlementDetail>
```

> 포함 결제/환불 항목 목록(`items`)이 함께 반환된다.

---

### 정산 리포트 수동 생성

```http
POST /api/v1/admin/settlements/generate
Body: { periodStart: "2026-06-01", periodEnd: "2026-06-30" }
응답: ApiResponse<SettlementListItem>
```

**에러 응답**:
- 동일 기간 CONFIRMED 건 존재 → `409 ALREADY_CONFIRMED`
- 동일 기간 PENDING 건 존재 → 삭제 후 재생성
- `periodStart >= periodEnd` → `400 INVALID_PERIOD`

---

### 정산 확정

```http
PATCH /api/v1/admin/settlements/{settlementId}/confirm
Body: { note?: "6월 정산 확정" }
응답: ApiResponse<{ settlementId; settlementStatus: "CONFIRMED"; settledAt }>
```

**에러 응답**:
- 이미 CONFIRMED → `409 ALREADY_CONFIRMED`

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `SETTLEMENT_NOT_FOUND` | 404 | 정산 리포트 조회/확정 실패 |
| `DUPLICATE_PERIOD` | 409 | 동일 기간 중복 (CONFIRMED 건) |
| `INVALID_PERIOD` | 400 | periodStart >= periodEnd |
| `ALREADY_CONFIRMED` | 409 | 이미 확정된 건 재확정/재생성 |
| `UNAUTHORIZED` | 401 | 인증 실패 |
