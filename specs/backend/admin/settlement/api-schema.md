# API Schema: 정산 리포트 관리 (Settlement Report)

> 백엔드 ↔ 프론트엔드 간 데이터 계약.
> 본 문서는 백엔드 구현 관점의 타입·메서드 시그니처를 정의한다.

---

## Controller 메서드 시그니처

### AdminSettlementController

```java
// 정산 리포트 목록 조회
ResponseEntity<ApiResponse<PaginationResponse<SettlementDTO.ResponseList>>> getSettlements(
    @RequestParam(required = false) String status,
    @RequestParam(defaultValue = "1") @Min(1) int page,
    @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
    @AuthenticationPrincipal AuthPrincipal principal
);

// 정산 리포트 상세 조회
ResponseEntity<ApiResponse<SettlementDTO.ResponseDetail>> getSettlementDetail(
    @PathVariable Long settlementId,
    @AuthenticationPrincipal AuthPrincipal principal
);

// 정산 리포트 생성 (집계)
ResponseEntity<ApiResponse<SettlementDTO.ResponseGenerate>> generateSettlement(
    @RequestBody @Valid SettlementDTO.RequestGenerate request,
    @AuthenticationPrincipal AuthPrincipal principal,
    HttpServletRequest httpServletRequest
);

// 정산 확정
ResponseEntity<ApiResponse<SettlementDTO.ResponseConfirm>> confirmSettlement(
    @PathVariable Long settlementId,
    @RequestBody(required = false) SettlementDTO.RequestConfirm request,
    @AuthenticationPrincipal AuthPrincipal principal,
    HttpServletRequest httpServletRequest
);
```

---

## 공통 응답 형식

```java
ApiResponse.ok(data);
ApiResponse.ok(message, data);
ApiResponse.fail(statusCode, message);
```

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {}
}
```

---

## 페이지네이션 응답 형식

```json
{
  "content": [],
  "pageNum": 1,
  "pageSize": 20,
  "totalElements": 100,
  "totalPages": 5
}
```

> `PaginationResponse<T>`는 `global/response/` 패키지에 공통 선언.

---

## 엔드포인트 요약

| Method | Path | 설명 |
|--------|------|------|
| `GET` | `/api/v1/admin/settlements` | 정산 리포트 목록 조회 (상태 필터, 페이지네이션) |
| `GET` | `/api/v1/admin/settlements/{settlementId}` | 정산 리포트 상세 + 포함 결제 내역 |
| `POST` | `/api/v1/admin/settlements/generate` | 특정 기간 정산 리포트 생성 (집계) |
| `PATCH` | `/api/v1/admin/settlements/{settlementId}/confirm` | 정산 확정 |

---

## 요청 / 응답 타입 상세

### GET /api/v1/admin/settlements

**Query Parameters**:

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| `status` | `String` | N | `PENDING` / `CONFIRMED` |
| `page` | `int` | N | 1-based (기본값 1) |
| `size` | `int` | N | 최대 100 (기본값 20) |

**Response Body** — `PaginationResponse<SettlementDTO.ResponseList>`:

```json
{
  "content": [
    {
      "settlementId": 1,
      "periodStart": "2026-06-01",
      "periodEnd": "2026-06-30",
      "totalSalesAmount": 1500000,
      "totalRefundAmount": 50000,
      "netSalesAmount": 1450000,
      "totalTransactionCount": 45,
      "settlementStatus": "PENDING",
      "createdAt": "2026-07-01T00:00:00+09:00"
    }
  ],
  "pageNum": 1,
  "pageSize": 20,
  "totalElements": 6,
  "totalPages": 1
}
```

---

### GET /api/v1/admin/settlements/{settlementId}

**Response Body** — `SettlementDTO.ResponseDetail`:

```json
{
  "settlementId": 1,
  "periodStart": "2026-06-01",
  "periodEnd": "2026-06-30",
  "totalSalesAmount": 1500000,
  "totalRefundAmount": 50000,
  "netSalesAmount": 1450000,
  "supplyAmount": 1318181,
  "vatAmount": 131819,
  "totalTransactionCount": 45,
  "paidCount": 42,
  "refundCount": 3,
  "settlementStatus": "CONFIRMED",
  "settledAt": "2026-07-02T14:30:00+09:00",
  "settledByName": "관리자1",
  "note": "6월 정산 확정",
  "createdAt": "2026-07-01T00:00:00+09:00",
  "items": [
    {
      "settlementItemId": 1,
      "paymentId": "550e8400-e29b-41d4-a716-446655440000",
      "orderId": "ORD-20260615-001",
      "memberName": "홍길동",
      "planName": "프리미엄 월간",
      "amount": 35000,
      "itemType": "PAYMENT",
      "paymentApprovedAt": "2026-06-15T10:30:00+09:00"
    }
  ]
}
```

---

### POST /api/v1/admin/settlements/generate

**Request Body** — `SettlementDTO.RequestGenerate`:

```json
{
  "periodStart": "2026-06-01",
  "periodEnd": "2026-06-30"
}
```

**Response Body** — `SettlementDTO.ResponseGenerate`:

```json
{
  "settlementId": 7,
  "periodStart": "2026-06-01",
  "periodEnd": "2026-06-30",
  "totalSalesAmount": 1500000,
  "totalRefundAmount": 50000,
  "netSalesAmount": 1450000,
  "totalTransactionCount": 45,
  "settlementStatus": "PENDING"
}
```

---

### PATCH /api/v1/admin/settlements/{settlementId}/confirm

**Request Body** — `SettlementDTO.RequestConfirm` (선택):

```json
{
  "note": "6월 정산 확정"
}
```

**Response Body** — `SettlementDTO.ResponseConfirm`:

```json
{
  "settlementId": 7,
  "settlementStatus": "CONFIRMED",
  "settledAt": "2026-07-02T14:30:00+09:00"
}
```

---

## ErrorCode → HTTP 매핑

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `SETTLEMENT_NOT_FOUND` | 404 | 정산 리포트 조회/확정 실패 |
| `DUPLICATE_PERIOD` | 409 | 동일 기간 정산 리포트 중복 생성 |
| `INVALID_PERIOD` | 400 | periodStart >= periodEnd |
| `ALREADY_CONFIRMED` | 409 | 이미 확정된 리포트 재확정 시도 |
| `UNAUTHORIZED` | 401 | 인증 실패 |
