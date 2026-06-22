# Spec: 사용자 구독·결제·이용 권한 API

**Feature Branch**: `feature/user-subscription-billing-spec`  
**버전**: v0.1 초안  
**Status**: 비즈니스 규칙 협의 중  
**담당**: maranqian  
**관련 FE 스펙**: `specs/frontend/user/subscription/`  
**관련 BE 도메인**: `user/resume`, `user/interview`, `admin/payment`

---

## 1. 도메인 개요

일반 회원에게 `서류 AI 코칭`과 `AI 모의면접` 상품별 무료 1회 이용권을 제공하고,
무료 이용권 소진 후 Toss Payments 월 자동결제를 통해 상품별 PREMIUM 구독을 제공한다.

본 스펙은 Subscription과 Billing을 하나의 기능 범위로 관리한다.

- 상품별 FREE/PREMIUM 권한
- 무료 1회 이용권
- 구독 월 사용량
- 결제 전·중·후 검증
- Toss billingKey 기반 최초 결제와 월 자동결제
- 자동결제 실패 시 즉시 서비스 중단 및 고정 재시도
- 구독 해지와 결제 내역
- Resume·Interview 도메인과의 이용 권한 연동

### Frontend 기준 원칙

본 Backend 스펙은 현재 구현된 Frontend UI와 버튼을 변경하지 않는 것을 전제로 한다.

- Backend가 현재 Frontend의 API 호출과 화면 표시 계약에 맞춘다.
- 현재 버튼 문구, 버튼 위치, 노출 조건, route, modal, success/fail 화면을 유지한다.
- UI 또는 버튼 변경이 필요한 요구사항은 본 스펙에 임의 반영하지 않는다.
- 해당 변경은 사용자에게 사전 설명하고 명시적 승인을 받은 뒤 별도 Frontend 작업으로 진행한다.

---

## 1.1 현재 Frontend 화면·버튼 계약

| 화면 | 현재 UI/버튼 | 현재 동작 | Backend 책임 |
|---|---|---|---|
| `/mypage/subscription` | `서류 AI 코칭 체험하기` | `/documents/resume` 이동 | Resume 시작 API에서 무료/구독 권한 판정 |
| `/mypage/subscription` | `AI 모의면접 체험하기` | `/interview` 이동 | Interview 시작 API에서 무료/구독 권한 판정 |
| `/mypage/subscription` | 상품 카드 `구매하기` | `/billing/checkout?product={productCode}` 이동 | productCode 상품 조회와 중복 구독 검증 |
| `/mypage/subscription` | 추천 카드 CTA | 동일 상품 checkout 이동 | 해당 상품 주문 생성 지원 |
| `/billing/checkout` | 자동 정기 결제 동의 checkbox | 미동의 시 결제 차단 | 주문 생성 시 약관 동의 검증·저장 |
| `/billing/checkout` | `Toss Payments로 결제하기` | 결제 요청 시작, 요청 중 disabled | 주문 멱등성과 결제 중복 방지 |
| `/billing/success` | 확인 중/성공/오류 UI | 서버 응답으로 상태 분기 | 성공 페이지 표시 필드 제공, 직접 접근 성공 처리 금지 |
| `/billing/fail` | `다시 결제하기` | 동일 상품 checkout 이동 | 실패 주문을 구독으로 활성화하지 않음 |
| `/billing/fail` | `AI 서비스로 돌아가기` | `/mypage/subscription` 이동 | 추가 책임 없음 |
| `/mypage/payment-history` | `구독 해지` | confirm modal 표시 | ACTIVE 구독 해지 예약 API 제공 |
| 해지 modal | `해지하기` | cancel API 호출 | `CANCEL_SCHEDULED` 응답 |
| 해지 modal | `취소` / `확인` | modal 종료 | 추가 책임 없음 |
| 결제 내역 | 기간 select | 1M/3M/6M/12M 재조회 | 기간 필터 지원 |
| 결제 내역 | `이전` / `다음` | 페이지 이동 | 현재 Frontend의 1-based UI를 0-based API page로 지원 |

### Frontend 기존 필드 호환

Backend는 현재 Frontend TypeScript가 사용하는 다음 응답 필드를 유지한다.

- `Product`: `productCode`, `name`, `description`, `price`, `currency`, `billingCycle`, `features`, `active`
- `Subscription`: `subscriptionId`, `productCode`, `productName`, `status`, `startedAt`, `currentPeriodStart`, `currentPeriodEnd`, `nextBillingAt`, `cancelScheduledAt`
- `UsageSummary`: `productCode`, `limit`, `used`, `remaining`, `unit`, `resetAt`
- `PaymentHistory`: `paymentId`, `orderId`, `productCode`, `productName`, `amount`, `currency`, `paymentStatus`, `paidAt`, `failureReason`
- 결제 성공 표시: `paymentId`, `orderId`, `productCode`, `productName`, `amount`, `currency`, `paymentStatus`, `subscriptionStatus`, `paidAt`, `nextBillingAt`

`reserved`, `planType`, `freeRemaining`, `paymentType` 등 신규 정보는 기존 필드를 제거하지 않고 추가 필드로 제공한다.

### 승인 전 변경 금지 항목

현재 checkout 버튼 내부 구현은 Toss SDK `requestPayment()`를 사용한다.
진짜 월 자동결제를 구현하려면 billing authorization SDK 흐름으로 내부 호출을 변경해야 한다.

- UI, 버튼 문구, 버튼 위치, checkout 화면, success/fail 화면은 변경하지 않는다.
- 내부 SDK 호출과 redirect 파라미터 변경은 사용자 승인 전 구현하지 않는다.
- Backend가 일반 단건 결제를 자동결제로 오인해 구독을 생성하는 것을 금지한다.

---

## 2. 사용자 시나리오

### Story 1 — 가입 후 상품별 무료 1회 이용

**As** 신규 일반 회원  
**I want** 두 AI 상품을 각각 1회 무료로 이용하고 싶다  
**So that** 결제 전에 서비스 가치를 확인할 수 있다

1. 회원 가입 완료 시 상품별 권한 레코드 2개를 생성한다.
2. 각 상품의 `planType`은 `FREE`, `freeRemaining`은 `1`이다.
3. 서비스 시작 시 무료 이용권을 `RESERVED`로 변경한다.
4. 최종 결과 생성 성공 시 `USED`, `freeRemaining=0`으로 변경한다.
5. 서비스 실패 시 `AVAILABLE`, `freeRemaining=1`로 복구한다.

### Story 2 — 무료 이용권 소진 후 구독 요구

**As** 무료 이용권을 소진한 일반 회원  
**I want** 구독 결제 안내를 받고 싶다  
**So that** 해당 상품을 계속 이용하는 방법을 바로 알 수 있다

1. 무료 이용권이 소진되고 유효한 구독이 없는 회원의 서비스 시작 요청을 차단한다.
2. 서버는 `SUBSCRIPTION_REQUIRED`를 반환한다.
3. 프론트는 해당 상품의 구독 결제 화면으로 이동시키는 CTA를 표시한다.

### Story 3 — 월 자동결제 구독 시작

**As** 구독을 시작하려는 일반 회원  
**I want** Toss Payments로 월 자동결제 구독을 등록하고 싶다  
**So that** 해당 상품을 월 제공량 안에서 계속 이용할 수 있다

1. 회원이 상품과 자동결제 약관을 확인한다.
2. 서버가 결제 전 검증 후 로컬 주문을 생성한다.
3. Toss 자동결제 인증으로 billingKey를 발급한다.
4. 서버가 billingKey로 최초 결제를 요청한다.
5. 결제 후 검증과 로컬 DB 반영이 완료되면 구독을 `ACTIVE`로 생성한다.
6. 상품별 권한을 `PREMIUM`으로 변경하고 월 사용량을 발급한다.

### Story 4 — 월 자동결제 성공

**As** 구독 중인 회원  
**I want** 매월 자동으로 결제가 갱신되기를 원한다  
**So that** 별도 조작 없이 구독이 끊기지 않도록 할 수 있다

1. `nextBillingAt` 도달 시 자동결제를 실행한다.
2. 결제 성공 시 성공 시각부터 새 월 이용 기간을 시작한다.
3. 새 기간의 월 사용량을 발급한다.
4. 다음 자동결제일을 새 기간 기준으로 저장한다.

### Story 5 — 월 자동결제 실패

**As** 자동결제에 실패한 구독 회원  
**I want** 결제 수단 문제를 해결하면 서비스가 자동으로 복구되기를 원한다  
**So that** 별도 재가입 없이 구독을 재개할 수 있다

1. 최초 자동결제 실패 즉시 구독을 `PAYMENT_FAILED`로 변경한다.
2. 해당 상품 서비스 권한을 즉시 차단한다.
3. 실패 후 1일째에 첫 번째 자동 재시도를 실행한다.
4. 실패 후 3일째에 두 번째 자동 재시도를 실행한다.
5. 재시도 성공 시 성공 시각부터 새 월 기간을 시작하고 서비스를 즉시 복구한다.
6. 두 번째 재시도 실패 시 구독을 `EXPIRED`로 변경하고 이후 자동결제를 종료한다.

### Story 6 — 구독 해지

**As** 구독 중인 회원  
**I want** 언제든지 구독을 해지할 수 있기를 원한다  
**So that** 현재 결제 기간이 끝난 후 더 이상 자동 결제되지 않도록 할 수 있다

1. `ACTIVE` 구독만 해지 신청할 수 있다.
2. 해지 신청 시 `CANCEL_SCHEDULED`, `autoRenew=false`로 변경한다.
3. 현재 결제 기간 종료까지 서비스 권한을 유지한다.
4. `currentPeriodEnd` 도달 시 `EXPIRED`로 변경하고 서비스 권한을 차단한다.
5. 해지는 이미 승인된 결제를 자동 환불하지 않는다.

---

## 3. ERD 초안

### 3.1 plans

기존 `plans` 테이블을 사용하며 월 제공 횟수를 추가한다.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `plan_id` | BIGSERIAL | PK | 플랜 ID |
| `product_code` | VARCHAR(30) | UNIQUE, NOT NULL | `document-coaching`, `interview` |
| `plan_name` | VARCHAR(50) | NOT NULL | 상품명 |
| `plan_price` | INTEGER | NOT NULL | 월 결제 금액 |
| `monthly_usage_limit` | INTEGER | NOT NULL | 월 제공 횟수 |
| `currency` | VARCHAR(10) | NOT NULL | `KRW` |
| `billing_cycle` | VARCHAR(20) | NOT NULL | `MONTHLY` |
| `is_active` | BOOLEAN | NOT NULL | 판매 여부 |
| `created_at` | TIMESTAMPTZ | NOT NULL | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 변경 시각 |

### 3.2 member_product_entitlements

회원별 상품 등급과 무료 이용권 상태를 관리한다.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `entitlement_id` | UUID | PK | 권한 ID |
| `member_id` | UUID | FK, NOT NULL | 회원 ID |
| `product_code` | VARCHAR(30) | NOT NULL | 상품 코드 |
| `plan_type` | VARCHAR(20) | NOT NULL | `FREE`, `PREMIUM` |
| `free_remaining` | INTEGER | NOT NULL, CHECK 0~1 | 무료 잔여 횟수 |
| `free_usage_status` | VARCHAR(20) | NOT NULL | `AVAILABLE`, `RESERVED`, `USED`, `FORFEITED` |
| `active_subscription_id` | UUID | NULL | 현재 연결 구독 |
| `created_at` | TIMESTAMPTZ | NOT NULL | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 변경 시각 |

제약:

- UNIQUE `(member_id, product_code)`
- `free_usage_status=AVAILABLE`이면 `free_remaining=1`
- `free_usage_status=USED/FORFEITED`이면 `free_remaining=0`

### 3.3 subscriptions

기존 테이블을 확장한다.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `subscription_id` | UUID | PK | 구독 ID |
| `member_id` | UUID | FK, NOT NULL | 회원 ID |
| `plan_id` | BIGINT | FK, NOT NULL | 플랜 ID |
| `billing_profile_id` | UUID | FK, NOT NULL | 자동결제 수단 |
| `subscription_status` | VARCHAR(30) | NOT NULL | 구독 상태 |
| `started_at` | TIMESTAMPTZ | NOT NULL | 최초 구독 시작 |
| `current_period_start` | TIMESTAMPTZ | NOT NULL | 현재 기간 시작 |
| `current_period_end` | TIMESTAMPTZ | NOT NULL | 현재 기간 종료 |
| `next_billing_at` | TIMESTAMPTZ | NULL | 다음 자동결제 시각 |
| `payment_failed_at` | TIMESTAMPTZ | NULL | 최초 자동결제 실패 시각 |
| `retry_count` | INTEGER | NOT NULL DEFAULT 0 | 완료된 자동 재시도 횟수 |
| `cancel_scheduled_at` | TIMESTAMPTZ | NULL | 해지 신청 시각 |
| `cancelled_at` | TIMESTAMPTZ | NULL | 종료 확정 시각 |
| `auto_renew` | BOOLEAN | NOT NULL | 자동결제 여부 |
| `created_at` | TIMESTAMPTZ | NOT NULL | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 변경 시각 |

### 3.4 billing_profiles

Toss 자동결제 수단을 서버에서 관리한다.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `billing_profile_id` | UUID | PK | 결제 수단 ID |
| `member_id` | UUID | FK, NOT NULL | 회원 ID |
| `customer_key` | VARCHAR(100) | UNIQUE, NOT NULL | 서버 발급 Toss 고객 키 |
| `encrypted_billing_key` | TEXT | NOT NULL | 암호화한 billingKey |
| `card_company` | VARCHAR(50) | NULL | 카드사 |
| `card_number_masked` | VARCHAR(30) | NULL | 마스킹 카드번호 |
| `billing_profile_status` | VARCHAR(20) | NOT NULL | `ACTIVE`, `REVOKED` |
| `authenticated_at` | TIMESTAMPTZ | NOT NULL | 인증 완료 시각 |
| `created_at` | TIMESTAMPTZ | NOT NULL | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 변경 시각 |

### 3.5 payments

기존 테이블을 확장한다.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `payment_id` | UUID | PK | 결제 ID |
| `member_id` | UUID | FK, NOT NULL | 회원 ID |
| `subscription_id` | UUID | FK, NULL | 최초 결제 성공 후 연결 |
| `plan_id` | BIGINT | FK, NOT NULL | 결제 플랜 |
| `order_id` | VARCHAR(100) | UNIQUE, NOT NULL | 주문 ID |
| `payment_key` | VARCHAR(200) | UNIQUE, NULL | Toss 결제 키 |
| `idempotency_key` | VARCHAR(100) | UNIQUE, NOT NULL | 멱등 키 |
| `payment_type` | VARCHAR(20) | NOT NULL | `MANUAL`, `AUTO_RENEWAL` |
| `payment_status` | VARCHAR(20) | NOT NULL | 결제 상태 |
| `attempt_sequence` | INTEGER | NOT NULL DEFAULT 0 | 최초 0, 재시도 1·2 |
| `amount` | INTEGER | NOT NULL | 결제 금액 |
| `currency` | VARCHAR(10) | NOT NULL | `KRW` |
| `failure_reason` | VARCHAR(50) | NULL | 표준 실패 사유 |
| `payment_method` | VARCHAR(30) | NULL | 결제 수단 |
| `approved_at` | TIMESTAMPTZ | NULL | 승인 시각 |
| `expires_at` | TIMESTAMPTZ | NULL | READY 주문 만료 시각 (MANUAL 주문만 설정) |
| `created_at` | TIMESTAMPTZ | NOT NULL | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 변경 시각 |

### 3.6 subscription_usage_periods

구독 월별 제공량을 관리한다.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `usage_period_id` | UUID | PK | 사용 기간 ID |
| `subscription_id` | UUID | FK, NOT NULL | 구독 ID |
| `product_code` | VARCHAR(30) | NOT NULL | 상품 코드 |
| `period_start` | TIMESTAMPTZ | NOT NULL | 기간 시작 |
| `period_end` | TIMESTAMPTZ | NOT NULL | 기간 종료 |
| `limit_count` | INTEGER | NOT NULL | 월 제공량 |
| `used_count` | INTEGER | NOT NULL DEFAULT 0 | 확정 사용량 |
| `reserved_count` | INTEGER | NOT NULL DEFAULT 0 | 진행 중 예약량 |
| `created_at` | TIMESTAMPTZ | NOT NULL | 생성 시각 |
| `updated_at` | TIMESTAMPTZ | NOT NULL | 변경 시각 |

제약:

- UNIQUE `(subscription_id, period_start)`
- `used_count + reserved_count <= limit_count`

### 3.7 service_usage_records

무료 이용권과 구독 사용량의 예약·확정·해제 이력을 통합 관리한다.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `usage_record_id` | UUID | PK | 사용 기록 ID |
| `member_id` | UUID | FK, NOT NULL | 회원 ID |
| `product_code` | VARCHAR(30) | NOT NULL | 상품 코드 |
| `resource_type` | VARCHAR(20) | NOT NULL | `DOCUMENT`, `INTERVIEW_SESSION` |
| `resource_id` | UUID | NOT NULL | documentId 또는 sessionId |
| `usage_source` | VARCHAR(20) | NOT NULL | `FREE`, `SUBSCRIPTION` |
| `usage_status` | VARCHAR(20) | NOT NULL | `RESERVED`, `CONSUMED`, `RELEASED` |
| `usage_period_id` | UUID | FK, NULL | 구독 사용인 경우 연결 |
| `reserved_at` | TIMESTAMPTZ | NOT NULL | 예약 시각 |
| `consumed_at` | TIMESTAMPTZ | NULL | 확정 시각 |
| `released_at` | TIMESTAMPTZ | NULL | 해제 시각 |

제약:

- UNIQUE `(resource_type, resource_id)`

### 3.8 billing_consents

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `billing_consent_id` | UUID | PK | 동의 ID |
| `member_id` | UUID | FK, NOT NULL | 회원 ID |
| `plan_id` | BIGINT | FK, NOT NULL | 대상 플랜 |
| `terms_version` | VARCHAR(30) | NOT NULL | 동의 약관 버전 |
| `agreed_at` | TIMESTAMPTZ | NOT NULL | 동의 시각 |
| `revoked_at` | TIMESTAMPTZ | NULL | 철회 시각 |

---

## 4. 이용 권한 판정 규칙

`EntitlementService.reserve(memberId, productCode, resourceType, resourceId)`는 다음 순서로 처리한다.

1. 회원 상태가 `ACTIVE`인지 확인한다.
2. 동일 `resourceType + resourceId` 사용 기록 존재 여부를 확인한다.
3. 상품별 권한 레코드를 비관적 락으로 조회한다.
4. 연결 구독이 `ACTIVE` 또는 `CANCEL_SCHEDULED`이면:
   a. 현재 월 사용량을 비관적 락으로 조회한다.
   b. `limitCount - usedCount - reservedCount > 0`이면 구독 사용량을 예약하고 완료한다.
   c. 월 제공량이 없으면 `MONTHLY_LIMIT_EXCEEDED`를 반환한다.
5. 유효한 구독이 없으면 무료 이용권 상태를 확인한다.
6. `AVAILABLE`이면 무료 이용권을 예약하고 완료한다.
7. 무료 이용권도 없으면 `SUBSCRIPTION_REQUIRED`를 반환한다.

### 성공 확정

`consume(resourceType, resourceId)`

- `RESERVED` 기록만 처리한다.
- 무료 사용이면 `free_usage_status=USED`, `free_remaining=0`으로 변경한다.
- 구독 사용이면 `reserved_count - 1`, `used_count + 1`로 변경한다.
- 사용 기록을 `CONSUMED`로 변경한다.
- 같은 성공 콜백 재수신 시 추가 차감하지 않는다.

### 실패 해제

`release(resourceType, resourceId)`

- `RESERVED` 기록만 처리한다.
- 무료 사용이면 `AVAILABLE`, `free_remaining=1`로 복구한다.
- 구독 사용이면 `reserved_count - 1`로 변경한다.
- 사용 기록을 `RELEASED`로 변경한다.
- 같은 실패 콜백 재수신 시 추가 변경하지 않는다.

---

## 5. 결제 3단계 상세 흐름

### 5.1 결제 전 검증

`POST /api/v1/user/billing/checkout/orders`

1. 회원 인증과 계정 상태를 확인한다.
2. 플랜 판매 상태를 확인한다.
3. 동일 상품의 중복 구독을 확인한다.
4. 서버 가격과 통화를 결제 주문에 복사한다.
5. 약관 동의를 저장한다.
6. `orderId`, `idempotencyKey`, `customerKey`를 서버에서 생성한다.
7. `payment_status=READY`, `payment_type=MANUAL` 결제를 저장한다.

### 5.2 결제 중 검증

`POST /api/v1/user/billing/payments/confirm`

1. 현재 회원 소유의 `READY` 주문을 조회한다.
2. `customerKey` 일치 여부를 확인한다.
3. Toss billing authorization API로 billingKey를 발급한다.
4. billingKey를 암호화하여 `billing_profiles`에 저장한다.
5. 결제 상태를 `AUTHORIZED`로 변경한다.
6. DB 커밋 후 billingKey 결제 API를 호출한다.

### 5.3 결제 후 검증

1. Toss 응답의 주문·금액·통화·상태를 로컬 주문과 대조한다.
2. 결제 상태를 `CONFIRMING`으로 변경한다.
3. 검증 성공 후 하나의 DB 트랜잭션에서 다음을 처리한다.
   - Payment를 `PAID`로 변경
   - Subscription을 `ACTIVE`로 생성
   - 상품 권한을 `PREMIUM`으로 변경
   - 미사용 무료 이용권을 `FORFEITED`, `freeRemaining=0`으로 변경
   - 첫 월 `subscription_usage_periods` 생성
4. 처리 완료 후에만 성공 응답을 반환한다.
5. Toss 성공과 로컬 반영 상태가 불일치하면 `RECONCILING`으로 전환한다.

### 5.4 미완료 주문 자동 만료

`READY` 상태로 생성된 주문이 지정 시간 내에 결제 인증 단계로 진행되지 않으면 Spring Scheduler가 `CANCELED`로 자동 전이한다.

- 주문 유효 시간은 `created_at`으로부터 30분이다.
- 스케줄러는 5분 간격으로 유효 시간을 초과한 `READY` 주문을 조회하고 일괄 `CANCELED`로 전이한다.
- `CANCELED` 주문에 결제 인증(`POST /api/v1/user/billing/payments/confirm`)을 요청하면 `BILLING_ORDER_NOT_READY`를 반환한다.
- `CANCELED` 주문은 동일 상품 중복 구독 검증 대상에서 제외한다.
- 만료된 주문이 있어도 해당 회원의 동일 상품 신규 주문 생성을 차단하지 않는다.

### 5.5 Toss Payments 연동 상세

#### 자동결제 인증 (Billing Authorization)

```
POST https://api.tosspayments.com/v1/billing/authorizations/issue
Authorization: Basic {Base64(TOSS_SECRET_KEY + ":")}
Content-Type: application/json
```

Request:
```json
{
  "authKey": "Toss redirect로 전달받은 authKey",
  "customerKey": "서버 발급 customerKey"
}
```

Response — 저장 대상:

| 필드 | 저장 위치 |
|---|---|
| `billingKey` | 암호화 후 `billing_profiles.encrypted_billing_key` |
| `card.company` | `billing_profiles.card_company` |
| `card.number` (마스킹) | `billing_profiles.card_number_masked` |
| `authenticatedAt` | `billing_profiles.authenticated_at` |

#### billingKey 결제 (Billing Payment)

```
POST https://api.tosspayments.com/v1/billing/{billingKey}
Authorization: Basic {Base64(TOSS_SECRET_KEY + ":")}
Content-Type: application/json
```

Request:
```json
{
  "customerKey": "서버 발급 customerKey",
  "amount": 9900,
  "orderId": "SUB-20260622-uuid",
  "orderName": "AI 모의면접 월 구독",
  "customerEmail": "user@example.com",
  "customerName": "홍길동"
}
```

Response — 검증 및 저장 대상:

| 필드 | 처리 |
|---|---|
| `status` | `DONE` 여부 확인 |
| `paymentKey` | UNIQUE 검증 후 `payments.payment_key` 저장 |
| `orderId` | 로컬 주문 `order_id`와 일치 확인 |
| `totalAmount` | 로컬 주문 금액과 일치 확인 |
| `approvedAt` | `payments.approved_at` 저장 |

---

## 6. 자동결제와 재시도

### 정상 자동결제

- 스케줄러는 `ACTIVE`, `autoRenew=true`, `nextBillingAt<=now` 구독을 조회한다.
- 구독 단위 분산 락을 획득한 뒤 자동결제를 한 번 실행한다.
- 성공 시 성공 시각부터 새 월 기간을 생성한다.
- `PAYMENT_FAILED` 상태였던 경우 `retryCount=0`, `paymentFailedAt=null`로 초기화한다.

### 최초 실패

- Payment를 `FAILED`, `attemptSequence=0`으로 저장한다.
- Subscription을 `PAYMENT_FAILED`로 변경한다.
- `paymentFailedAt`을 기록한다.
- 서비스 권한을 즉시 차단한다.
- 첫 번째 재시도 시각을 `paymentFailedAt + 1일`로 저장한다.

### 첫 번째 재시도 실패

- Payment를 `FAILED`, `attemptSequence=1`로 저장한다.
- Subscription은 `PAYMENT_FAILED`를 유지한다.
- 서비스 권한은 차단 상태를 유지한다.
- 두 번째 재시도 시각을 `paymentFailedAt + 3일`로 저장한다.

### 두 번째 재시도 실패

- Payment를 `FAILED`, `attemptSequence=2`로 저장한다.
- Subscription을 `EXPIRED`로 변경한다.
- `autoRenew=false`, `nextBillingAt=null`, `cancelledAt=now`로 변경한다.
- 상품 권한을 `FREE`로 변경하고 서비스 접근을 차단한다.
- 무료 이용권은 다시 발급하지 않는다.

### 재시도 성공

- Payment를 `PAID`로 저장한다.
- Subscription을 `ACTIVE`로 복구한다.
- 성공 시각부터 새 월 기간을 생성한다.
- 상품 권한을 `PREMIUM`으로 유지한다.
- 서비스를 즉시 복구한다.
- 다음 자동결제일을 새 기간 기준으로 저장한다.

---

## 7. API 범위

### 상품·구독·사용량

- `GET /api/v1/user/billing/products`
- `GET /api/v1/user/subscriptions/me`
- `GET /api/v1/user/subscriptions/me/usages`
- `GET /api/v1/user/subscriptions/me/entitlements`
- `POST /api/v1/user/subscriptions/{subscriptionId}/cancel`

### 최초 결제

- `POST /api/v1/user/billing/checkout/orders`
- `POST /api/v1/user/billing/payments/confirm`
- `POST /api/v1/user/billing/payments/fail`
- `GET /api/v1/user/billing/payments/orders/{orderId}`

### 결제 내역

- `GET /api/v1/user/billing/payments/history`

### 내부 도메인 연동

- 외부 HTTP API를 추가하지 않고 Spring 내부 `EntitlementService`를 Resume·Interview Service에서 호출한다.

---

## 8. ErrorCode

| ErrorCode | HTTP | 발생 조건 |
|---|---:|---|
| `PRODUCT_NOT_FOUND` | 404 | 상품 없음 |
| `PRODUCT_NOT_ACTIVE` | 409 | 판매 중지 상품 |
| `SUBSCRIPTION_ALREADY_ACTIVE` | 409 | 동일 상품 구독 중 |
| `SUBSCRIPTION_NOT_FOUND` | 404 | 구독 없음 |
| `SUBSCRIPTION_NOT_CANCELABLE` | 409 | ACTIVE가 아닌 구독 해지 요청 |
| `SUBSCRIPTION_REQUIRED` | 402 | 무료 이용권 소진 및 유효 구독 없음 |
| `MONTHLY_LIMIT_EXCEEDED` | 429 | 월 제공량 소진 |
| `SERVICE_USAGE_ALREADY_RESERVED` | 409 | 동일 resource 중복 예약 |
| `SERVICE_USAGE_NOT_RESERVED` | 409 | 예약 없는 consume/release |
| `BILLING_ORDER_NOT_FOUND` | 404 | 주문 없음 |
| `BILLING_ORDER_NOT_READY` | 409 | 처리 가능한 주문 상태 아님 (만료 CANCELED 포함) |
| `BILLING_CUSTOMER_KEY_MISMATCH` | 400 | customerKey 불일치 |
| `BILLING_AUTHORIZATION_FAILED` | 422 | billingKey 발급 실패 |
| `PAYMENT_AMOUNT_MISMATCH` | 400 | Toss 금액과 로컬 주문 금액 불일치 |
| `PAYMENT_CONFIRM_FAILED` | 422 | 실제 결제 승인 실패 |
| `PAYMENT_RECONCILIATION_REQUIRED` | 202 | Toss 결과와 로컬 상태 대사 필요 |
| `PAYMENT_METHOD_REQUIRED` | 409 | 활성 billing profile 없음 |
| `ACCOUNT_NOT_ELIGIBLE` | 403 | 계정 상태로 결제·이용 불가 |

### Toss 에러코드 매핑

| Toss errorCode | 발생 조건 | 내부 ErrorCode |
|---|---|---|
| `INVALID_CARD_NUMBER`, `INVALID_EXPIRY_DATE` | 인증 단계 카드 정보 오류 | `BILLING_AUTHORIZATION_FAILED` |
| `CARD_COMPANY_REJECT` | 인증 단계 카드사 거절 | `BILLING_AUTHORIZATION_FAILED` |
| `REJECT_CARD_COMPANY` | 결제 단계 카드사 거절 | `PAYMENT_CONFIRM_FAILED` |
| `INSUFFICIENT_FUNDS` | 한도 초과·잔액 부족 | `PAYMENT_CONFIRM_FAILED` |
| `INVALID_STOPPED_CARD`, `DORMANT_CONSUMER_CARD` | 정지·휴면 카드 | `PAYMENT_CONFIRM_FAILED` |
| `EXCEED_MAX_DAILY_PAYMENT_COUNT` | 일 결제 한도 초과 | `PAYMENT_CONFIRM_FAILED` |
| `NOT_FOUND_BILLING_KEY` | billingKey 불존재 | `PAYMENT_METHOD_REQUIRED` |
| `INVALID_API_KEY`, `UNAUTHORIZED_KEY` | 서버 설정 오류 | 500 내부 오류 (응답 노출 금지) |

---

## 9. 비기능 요구사항

- 이용권 예약과 사용량 증감은 DB 락과 유니크 제약으로 동시성을 보호한다.
- 결제와 구독 상태 변경은 멱등성을 보장한다.
- Toss 외부 호출에는 connect/read timeout을 설정한다.
- 자동결제 스케줄러는 같은 구독을 동시에 처리하지 않는다.
- 결제 민감정보는 암호화 저장하고 로그 마스킹을 적용한다.
- 모든 사용자 API는 `ApiResponse<T>`를 사용한다.
- 결제 내역은 0-based 페이지네이션을 사용한다.
- 주문 만료 스케줄러는 동일 주문을 중복으로 CANCELED 처리하지 않는다.
- 모든 스케줄러는 `Asia/Seoul` 타임존을 기준으로 실행한다.
- Controller에서 비즈니스 예외를 `try-catch`로 처리하지 않는다.

### 환경 변수

| 변수명 | 용도 | 범위 |
|---|---|---|
| `TOSS_SECRET_KEY` | Toss API Authorization 헤더 인증 | Backend |
| `VITE_TOSS_CLIENT_KEY` | Toss SDK 초기화 | Frontend |
| `TOSS_BILLING_KEY_ENCRYPTION_KEY` | billingKey DB 암호화 키 | Backend |

---

## 10. 범위 밖 (Out of Scope)

- 환불 자동 처리 — 해지와 환불은 별도 업무이며 admin/payment 도메인에서 별도 협의
- 쿠폰·할인 코드 적용
- 연간 구독 플랜
- 복수 결제수단 등록·관리
- 구독 플랜 변경 (업그레이드·다운그레이드)
- 관리자에 의한 구독 강제 해지 — admin 도메인 관리
- Frontend UI·버튼·route 변경 — 별도 사용자 승인 후 진행

---

## 11. 초안 미확정 항목

가격, 월 제공 횟수, 말일 결제일 계산, 환불 규칙은 `constitution.md`의 결정 필요 항목에서 확정한다.
