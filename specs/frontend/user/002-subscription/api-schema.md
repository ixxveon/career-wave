# API Schema: User Subscription & Billing

> 백엔드 통신을 위한 프론트엔드 계약안입니다.  
> 관련 문서: `constitution.md` / `plan.md` / `tasks.md` / `spec.md`  
> ERD 초안에는 결제/구독 모델이 부족하므로 backend spec에서 확정이 필요합니다.

---

## 공통

### Base URL

```txt
/api/v1/subscriptions
/api/v1/billing
```

### 날짜 포맷

모든 날짜와 시간은 ISO 8601 형식을 사용한다. 예: `2026-05-31T12:30:00Z`

### 필드명 표기

DB 컬럼명은 snake_case(`payment_id`)를 따르며, Frontend API DTO는 기존 user frontend 문서 관례에 따라 camelCase(`paymentId`)를 사용한다.

### 인증

모든 API는 로그인된 사용자 기준으로 동작한다.

```txt
Authorization: Bearer {accessToken}
```

### 응답 공통 포맷

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {}
}
```

### 공통 Enum

| Enum | Values |
|------|--------|
| `ProductCode` | `document-coaching`, `interview` |
| `BillingCycle` | `MONTHLY` |
| `SubscriptionStatus` | `NONE`, `ACTIVE`, `CANCEL_SCHEDULED`, `EXPIRED`, `PAYMENT_FAILED`, `REFUND_PENDING`, `REFUNDED` |
| `PaymentStatus` | `READY`, `AGREED`, `REQUESTING`, `REDIRECTING`, `CONFIRMING`, `PAID`, `FAILED`, `CANCELED`, `REFUNDED` |
| `PaymentFailureReason` | `USER_CANCELED`, `CARD_DECLINED`, `TIMEOUT`, `DUPLICATE_ORDER`, `CONFIRM_FAILED`, `FORBIDDEN`, `UNKNOWN` |

### 공통 Error Cases

| statusCode | 상황 | 프론트 처리 |
|------------|------|-------------|
| `400` | 잘못된 product/order 요청 | checkout 오류 안내 |
| `401` | 인증 필요/토큰 만료 | 로그인 페이지 이동 |
| `403` | 제재 회원, 권한 없음, 승인 대기 | 결제 제한 안내 |
| `404` | 존재하지 않는 상품/order/payment | 상품 선택 또는 내역 페이지 이동 |
| `409` | 중복 주문 또는 이미 구독중 | 상태 재조회 후 안내 |
| `422` | 결제 승인 실패 | fail 페이지 표시 |
| `429` | 요청 과다 | 재시도 제한 안내 |
| `500` | 서버/PG 연동 오류 | 재시도 또는 문의 안내 |

---

## 1. 상품 목록 조회

- **Endpoint**: `GET /api/v1/billing/products`

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": [
    {
      "productCode": "document-coaching",
      "name": "서류 AI 코칭",
      "description": "이력서와 자기소개서 AI 분석",
      "price": 9900,
      "currency": "KRW",
      "billingCycle": "MONTHLY",
      "features": ["서류 분석", "피드백 리포트", "개선 제안"],
      "active": true
    },
    {
      "productCode": "interview",
      "name": "AI 모의면접",
      "description": "텍스트/음성 기반 AI 면접 연습",
      "price": 12900,
      "currency": "KRW",
      "billingCycle": "MONTHLY",
      "features": ["모의면접", "AI 피드백", "리포트"],
      "active": true
    }
  ]
}
```

---

## 2. 내 구독 목록 조회

- **Endpoint**: `GET /api/v1/subscriptions/me`

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "subscriptions": [
      {
        "subscriptionId": "uuid-v4",
        "productCode": "document-coaching",
        "productName": "서류 AI 코칭",
        "status": "ACTIVE",
        "startedAt": "2026-05-01T00:00:00Z",
        "currentPeriodStart": "2026-05-01T00:00:00Z",
        "currentPeriodEnd": "2026-06-01T00:00:00Z",
        "nextBillingAt": "2026-06-01T00:00:00Z",
        "cancelScheduledAt": null
      }
    ]
  }
}
```

---

## 3. AI 서비스 사용량 조회

- **Endpoint**: `GET /api/v1/subscriptions/me/usages`

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "usages": [
      {
        "productCode": "document-coaching",
        "limit": 30,
        "used": 12,
        "remaining": 18,
        "unit": "analysis",
        "resetAt": "2026-06-01T00:00:00Z"
      },
      {
        "productCode": "interview",
        "limit": 20,
        "used": 5,
        "remaining": 15,
        "unit": "session",
        "resetAt": "2026-06-01T00:00:00Z"
      }
    ]
  }
}
```

---

## 4. Checkout Order 생성

- **Endpoint**: `POST /api/v1/billing/checkout/orders`

### Request

```json
{
  "productCode": "document-coaching",
  "successUrl": "https://career-wave.example.com/billing/success",
  "failUrl": "https://career-wave.example.com/billing/fail"
}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "결제 요청이 생성되었습니다.",
  "data": {
    "orderId": "order-20260531-0001",
    "idempotencyKey": "uuid-v4",
    "productCode": "document-coaching",
    "productName": "서류 AI 코칭",
    "amount": 9900,
    "currency": "KRW",
    "billingCycle": "MONTHLY",
    "customerName": "홍길동",
    "customerEmail": "user@example.com",
    "expiresAt": "2026-05-31T12:45:00Z"
  }
}
```

> 최종 금액은 이 응답과 백엔드 confirm 검증 기준으로 확정한다. 프론트 query의 가격값은 신뢰하지 않는다.

---

## 5. Toss 결제 승인 Confirm

- **Endpoint**: `POST /api/v1/billing/payments/confirm`

### Request

```json
{
  "paymentKey": "toss-payment-key",
  "orderId": "order-20260531-0001",
  "amount": 9900
}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "결제가 완료되었습니다.",
  "data": {
    "paymentId": "uuid-v4",
    "orderId": "order-20260531-0001",
    "productCode": "document-coaching",
    "productName": "서류 AI 코칭",
    "amount": 9900,
    "currency": "KRW",
    "paymentStatus": "PAID",
    "subscriptionStatus": "ACTIVE",
    "paidAt": "2026-05-31T12:40:00Z",
    "nextBillingAt": "2026-06-30T12:40:00Z"
  }
}
```

### Error Cases

| statusCode | 상황 |
|------------|------|
| `400` | amount/order 불일치 |
| `409` | 이미 처리된 order |
| `422` | PG 승인 실패 |
| `500` | PG confirm 중 서버 오류 |

---

## 6. 결제 상태 조회

- **Endpoint**: `GET /api/v1/billing/payments/orders/{orderId}`

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "orderId": "order-20260531-0001",
    "paymentStatus": "PAID",
    "productCode": "document-coaching",
    "productName": "서류 AI 코칭",
    "amount": 9900,
    "paidAt": "2026-05-31T12:40:00Z",
    "failure": null
  }
}
```

---

## 7. 결제 실패 기록

- **Endpoint**: `POST /api/v1/billing/payments/fail`

### Request

```json
{
  "orderId": "order-20260531-0001",
  "productCode": "document-coaching",
  "reasonCode": "USER_CANCELED",
  "message": "사용자가 결제를 취소했습니다."
}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "결제 실패가 기록되었습니다.",
  "data": {
    "orderId": "order-20260531-0001",
    "paymentStatus": "CANCELED",
    "retryable": true
  }
}
```

---

## 8. 결제 내역 조회

- **Endpoint**: `GET /api/v1/billing/payments/history`

### Query Parameters

| Parameter | Type | 필수 | 기본값 | 설명 |
|-----------|------|------|--------|------|
| `page` | `number` | N | `0` | 0-based page |
| `size` | `number` | N | `10` | 페이지 크기 |
| `period` | `string` | N | `3M` | `1M`, `3M`, `6M`, `12M` |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "content": [
      {
        "paymentId": "uuid-v4",
        "orderId": "order-20260531-0001",
        "productCode": "document-coaching",
        "productName": "서류 AI 코칭",
        "amount": 9900,
        "currency": "KRW",
        "paymentStatus": "PAID",
        "paidAt": "2026-05-31T12:40:00Z",
        "failureReason": null
      }
    ],
    "page": 0,
    "size": 10,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

---

## 9. 구독 해지 신청

- **Endpoint**: `POST /api/v1/subscriptions/{subscriptionId}/cancel`

### Request

```json
{
  "reason": "NO_LONGER_NEEDED"
}
```

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "구독 해지 신청이 완료되었습니다.",
  "data": {
    "subscriptionId": "uuid-v4",
    "productCode": "document-coaching",
    "status": "CANCEL_SCHEDULED",
    "currentPeriodEnd": "2026-06-30T12:40:00Z",
    "cancelScheduledAt": "2026-05-31T13:00:00Z"
  }
}
```

---

## 10. 구독 권한 조회

- **Endpoint**: `GET /api/v1/subscriptions/me/entitlements`

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공적으로 처리되었습니다.",
  "data": {
    "entitlements": {
      "document-coaching": true,
      "interview": false
    }
  }
}
```
