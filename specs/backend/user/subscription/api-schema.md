# API Schema: 사용자 구독·결제·이용 권한

> v0.1 초안. 현재 구현된 Frontend UI·버튼·route·TypeScript 계약을 변경하지 않는 것을 기준으로 한다.
> 기존 필드는 제거하거나 이름을 변경하지 않고, 추가 정보는 optional 확장 필드로 제공한다.

---

## 공통

- Base URL
  - `/api/v1/user/subscriptions`
  - `/api/v1/user/billing`
- 인증: USER JWT 필수
- 날짜: ISO 8601
- 통화: `KRW`
- 응답: `ApiResponse<T>`

---

## Enum

| Enum | Values |
|---|---|
| `ProductCode` | `document-coaching`, `interview` |
| `PlanType` | `FREE`, `PREMIUM` |
| `FreeUsageStatus` | `AVAILABLE`, `RESERVED`, `USED`, `FORFEITED` |
| `SubscriptionStatus` | `ACTIVE`, `CANCEL_SCHEDULED`, `PAYMENT_FAILED`, `EXPIRED`, `REFUND_PENDING`, `REFUNDED` |
| `PaymentStatus` | **FE 노출**: `READY`, `AGREED`, `REQUESTING`, `REDIRECTING`, `CONFIRMING`, `PAID`, `FAILED`, `CANCELED`, `REFUNDED` / **서버 내부 전용** (API 응답 미포함): `AUTHORIZED` (billingKey 인가 완료), `RECONCILING` (결제 기록 처리 중) |
| `PaymentType` | `MANUAL`, `AUTO_RENEWAL` |

---

## 1. 상품 목록

```http
GET /api/v1/user/billing/products
```

```json
{
  "success": true,
  "statusCode": 200,
  "message": "상품 목록을 조회했습니다.",
  "data": [
    {
      "productCode": "document-coaching",
      "name": "서류 AI 코칭",
      "description": "이력서와 자기소개서 AI 분석",
      "price": 0,
      "currency": "KRW",
      "billingCycle": "MONTHLY",
      "features": ["서류 분석", "피드백 리포트", "개선 제안"],
      "monthlyUsageLimit": 0,
      "active": true
    }
  ]
}
```

> `price`, `monthlyUsageLimit`의 0은 문서 초안 placeholder이다. 구현 전 확정값으로 교체한다.
>
> **주의**: `amount` 값은 반드시 양의 정수여야 한다. FE `usePaymentSuccessStatus()`는 `amount <= 0`이면 직접 접근으로 간주하여 `/mypage/subscription`으로 리다이렉트한다. 초안 예시에 표기된 `amount: 0`은 가격 미확정 placeholder이며 실제 구현 시 교체한다.

---

## 2. 내 상품별 권한

```http
GET /api/v1/user/subscriptions/me/entitlements
```

```json
{
  "success": true,
  "statusCode": 200,
  "message": "상품별 이용 권한을 조회했습니다.",
  "data": {
    "entitlements": {
      "document-coaching": true,
      "interview": true
    },
    "entitlementDetails": [
      {
        "productCode": "document-coaching",
        "planType": "FREE",
        "freeRemaining": 1,
        "freeUsageStatus": "AVAILABLE",
        "subscriptionStatus": null,
        "serviceAvailable": true,
        "unavailableReason": null
      },
      {
        "productCode": "interview",
        "planType": "PREMIUM",
        "freeRemaining": 0,
        "freeUsageStatus": "FORFEITED",
        "subscriptionStatus": "ACTIVE",
        "serviceAvailable": true,
        "unavailableReason": null
      }
    ]
  }
}
```

> 현재 Frontend의 `Entitlements = Record<ProductCode, boolean>` 계약을 유지한다.
> FREE 1회 사용 가능 상태도 `entitlements[productCode]=true`이다.
> 상세 FREE/PREMIUM 상태는 기존 UI를 깨뜨리지 않는 추가 필드 `entitlementDetails`로 제공한다.

---

## 3. 내 구독

```http
GET /api/v1/user/subscriptions/me
```

```json
{
  "success": true,
  "statusCode": 200,
  "message": "구독 정보를 조회했습니다.",
  "data": {
    "subscriptions": [
      {
        "subscriptionId": "uuid-v4",
        "productCode": "interview",
        "productName": "AI 모의면접",
        "status": "ACTIVE",
        "startedAt": "2026-06-22T10:00:00+09:00",
        "currentPeriodStart": "2026-06-22T10:00:00+09:00",
        "currentPeriodEnd": "2026-07-22T10:00:00+09:00",
        "nextBillingAt": "2026-07-22T10:00:00+09:00",
        "cancelScheduledAt": null
      }
    ]
  }
}
```

---

## 4. 내 사용량

```http
GET /api/v1/user/subscriptions/me/usages
```

```json
{
  "success": true,
  "statusCode": 200,
  "message": "사용량을 조회했습니다.",
  "data": {
    "usages": [
      {
        "productCode": "interview",
        "limit": 20,
        "used": 3,
        "remaining": 16,
        "unit": "session",
        "resetAt": "2026-07-22T10:00:00+09:00",
        "reserved": 1
      }
    ]
  }
}
```

---

## 5. 결제 주문 생성 — 결제 전 검증

```http
POST /api/v1/user/billing/checkout/orders
```

```json
{
  "productCode": "interview",
  "successUrl": "https://career-wave.example.com/billing/success",
  "failUrl": "https://career-wave.example.com/billing/fail"
}
```

```json
{
  "success": true,
  "statusCode": 201,
  "message": "자동결제 주문을 생성했습니다.",
  "data": {
    "orderId": "SUB-20260622-uuid",
    "idempotencyKey": "uuid-v4",
    "productCode": "interview",
    "productName": "AI 모의면접",
    "amount": 0,
    "currency": "KRW",
    "billingCycle": "MONTHLY",
    "customerName": "홍길동",
    "customerEmail": "user@example.com",
    "expiresAt": "2026-06-22T10:15:00+09:00"
  }
}
```

---

## 6. 결제 확인 — 현재 Frontend API 이름 유지

```http
POST /api/v1/user/billing/payments/confirm
```

### 현재 Frontend Request

```json
{
  "paymentKey": "toss-payment-or-authorization-key",
  "orderId": "SUB-20260622-uuid",
  "amount": 9900
}
```

### billingKey 자동결제 승인 후 Request

```json
{
  "authKey": "toss-billing-authorization-key",
  "customerKey": "server-generated-customer-key",
  "orderId": "SUB-20260622-uuid"
}
```

> 두 Request를 동시에 최종 계약으로 사용하지 않는다.
> 현재 `requestPayment()`를 유지하면 첫 번째 Request이며 일반 단건 결제만 가능하다.
> 월 자동결제를 구현하려면 사용자 승인 후 Frontend hook 내부를 변경하고 두 번째 Request를 최종 계약으로 확정한다.
> endpoint 이름과 success 페이지 UI는 그대로 유지한다.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "최초 결제와 구독 활성화가 완료되었습니다.",
  "data": {
    "paymentId": "uuid-v4",
    "orderId": "SUB-20260622-uuid",
    "productCode": "interview",
    "productName": "AI 모의면접",
    "amount": 9900,
    "currency": "KRW",
    "paymentStatus": "PAID",
    "subscriptionStatus": "ACTIVE",
    "paidAt": "2026-06-22T10:05:00+09:00",
    "nextBillingAt": "2026-07-22T10:05:00+09:00"
  }
}
```

> billingKey는 응답에 포함하지 않는다.
>
> 구독 기간 필드(`currentPeriodStart`, `currentPeriodEnd`)는 confirm 응답에 포함하지 않는다. FE `ConfirmPaymentResponse` 인터페이스에 해당 필드가 없으며, 성공 페이지 이후 `GET /subscriptions/me`를 통해 조회한다.
>
> 현재 Frontend가 호출하는 `/payments/confirm` endpoint와 Response 필드명을 유지한다.
> Request 필드는 위 승인 게이트에서 월 자동결제용 DTO로 확정한다.
> UI·버튼·route는 변경하지 않는다.

---

## 7. 주문 결제 상태 조회

```http
GET /api/v1/user/billing/payments/orders/{orderId}
```

```json
{
  "success": true,
  "statusCode": 200,
  "message": "결제 상태를 조회했습니다.",
  "data": {
    "orderId": "SUB-20260622-uuid",
    "paymentStatus": "PAID",
    "productCode": "interview",
    "productName": "AI 모의면접",
    "amount": 9900,
    "paidAt": "2026-06-22T10:05:00+09:00",
    "failure": null
  }
}
```

> 결제 실패 시 `failure` 구조: `{ "reasonCode": "CARD_DECLINED", "displayMessage": "카드 승인이 거절되었습니다.", "retryable": true }`. 성공 시 `null`.

---

## 8. 구독 해지 예약

```http
POST /api/v1/user/subscriptions/{subscriptionId}/cancel
```

```json
{
  "reason": "NO_LONGER_NEEDED"
}
```

```json
{
  "success": true,
  "statusCode": 200,
  "message": "구독 해지를 예약했습니다.",
  "data": {
    "subscriptionId": "uuid-v4",
    "productCode": "interview",
    "status": "CANCEL_SCHEDULED",
    "currentPeriodEnd": "2026-07-22T10:05:00+09:00",
    "cancelScheduledAt": "2026-06-25T12:00:00+09:00"
  }
}
```

---

## 9. 결제 내역

```http
GET /api/v1/user/billing/payments/history?period=12M&page=0&size=10
```

```json
{
  "success": true,
  "statusCode": 200,
  "message": "결제 내역을 조회했습니다.",
  "data": {
    "content": [
      {
        "paymentId": "uuid-v4",
        "orderId": "SUB-20260622-uuid",
        "productCode": "interview",
        "productName": "AI 모의면접",
        "amount": 0,
        "currency": "KRW",
        "paymentStatus": "PAID",
        "paidAt": "2026-06-22T10:05:00+09:00",
        "failureReason": null,
        "paymentType": "MANUAL"
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

## 10. 결제 실패 기록

```http
POST /api/v1/user/billing/payments/fail
```

> FE `usePaymentFailStatus()`가 fail URL 진입 시 자동 호출한다. `orderId` 없이 진입하면 호출하지 않고 `/mypage/subscription`으로 리다이렉트한다.

### Request

```json
{
  "orderId": "SUB-20260622-uuid",
  "productCode": "interview",
  "reasonCode": "USER_CANCELED",
  "message": "PAY_PROCESS_CANCELED"
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `orderId` | `string` | 실패한 주문 ID |
| `productCode` | `ProductCode` | 상품 코드 |
| `reasonCode` | `PaymentFailureReason` | FE가 매핑한 실패 사유 코드 |
| `message` | `string` | Toss 원본 에러 코드 또는 reasonCode |

### Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "결제 실패를 기록했습니다.",
  "data": {
    "orderId": "SUB-20260622-uuid",
    "paymentStatus": "FAILED",
    "retryable": true
  }
}
```

| 필드 | 타입 | 설명 |
|---|---|---|
| `orderId` | `string` | 실패 처리된 주문 ID |
| `paymentStatus` | `PaymentStatus` | 항상 `FAILED` |
| `retryable` | `boolean` | FE `다시 결제하기` 버튼 노출 여부 |

> `retryable` 판단 기준: `USER_CANCELED`, `CARD_DECLINED`, `TIMEOUT` → `true` / `DUPLICATE_ORDER`, `CONFIRM_FAILED`, `FORBIDDEN` → `false`.
> `PaymentFailureReason`: `USER_CANCELED`, `CARD_DECLINED`, `TIMEOUT`, `DUPLICATE_ORDER`, `CONFIRM_FAILED`, `FORBIDDEN`, `UNKNOWN`

---

## 11. 공통 Error 응답

```json
{
  "success": false,
  "statusCode": 402,
  "message": "무료 이용권이 소진되었습니다. 구독 후 이용해주세요.",
  "code": "SUBSCRIPTION_REQUIRED"
}
```

---

## 12. 현재 Frontend Button → Backend 계약

| Frontend 동작 | Backend 계약 |
|---|---|
| 상품 카드 `구매하기` | `GET /billing/products`가 query의 productCode와 동일한 상품을 반환 |
| checkout 동의 후 `Toss Payments로 결제하기` | `POST /billing/checkout/orders`가 현재 `CreateOrderResponse` 필드를 모두 반환 |
| success 페이지 진입 | `POST /billing/payments/confirm` 응답이 현재 `ConfirmPaymentResponse` 필드를 모두 반환 |
| fail 페이지 진입 | `POST /billing/payments/fail`이 `{ orderId, productCode, reasonCode, message }` 수용, `{ orderId, paymentStatus, retryable }` 반환 |
| `다시 결제하기` | 기존 order 재사용 없이 같은 productCode로 새 READY 주문 생성 |
| `구독 해지` modal 확인 | `POST /subscriptions/{subscriptionId}/cancel`이 기존 `CancelSubscriptionResponse` 필드를 반환 |
| 기간 select | `period=1M/3M/6M/12M` 지원 |
| 이전/다음 | API는 0-based page를 유지하고 Frontend가 1-based로 표시 |
