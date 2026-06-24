# Constitution: 사용자 구독·결제·이용 권한 도메인

**Feature Branch**: `feature/user-subscription-billing-spec`  
**Scope**: 무료 1회 이용권 / 상품별 구독 / Toss Payments 자동결제 / 월 사용량 / 구독 해지 / 결제 내역  
**버전**: v0.1 초안  
**Status**: 비즈니스 규칙 협의 중

---

## 1. 도메인 가치

일반 회원은 가입 후 `서류 AI 코칭`과 `AI 모의면접`을 각각 1회 무료로 이용할 수 있다.
무료 이용권을 소진한 상품은 해당 상품의 월 구독 결제가 완료된 경우에만 다시 이용할 수 있다.

구독·결제 도메인은 다음 질문에 대한 단일한 답을 제공한다.

1. 회원이 특정 상품을 지금 이용할 수 있는가?
2. 이번 이용은 무료 이용권과 구독 월 사용량 중 무엇을 사용해야 하는가?
3. Toss Payments 결제가 실제로 완료되었는가?
4. 자동결제 실패 후 서비스 권한과 재시도 일정은 어떻게 변경되는가?

---

## 2. 핵심 불변 규칙

- 현재 구현된 Frontend UI, 버튼, 버튼 문구, route, modal, 페이지 전환 흐름을 Backend 구현을 이유로 변경하지 않는다.
- Backend API와 상태 응답은 현재 Frontend가 호출하고 표시하는 구조에 맞춘다.
- UI 또는 버튼 변경이 반드시 필요한 경우 구현 전에 변경 사유·대상·영향 범위를 사용자에게 설명하고 명시적 승인을 받은 뒤에만 Frontend를 수정한다.
- 승인 없이 Frontend 컴포넌트, 버튼 문구, 버튼 노출 조건, route를 변경하는 것을 금지한다.
- 권한 판단 단위는 반드시 `회원 + 상품`이다.
- `members.subscription_status(FREE/PREMIUM)` 단일 필드만으로 상품 권한을 판단하지 않는다.
- 회원 가입 완료 시 상품별 권한 레코드를 2개 생성한다.
  - `document-coaching`: `planType=FREE`, `freeRemaining=1`
  - `interview`: `planType=FREE`, `freeRemaining=1`
- 무료 이용권은 서비스의 최종 결과가 정상 생성된 경우에만 1회 차감한다.
- 서비스 시작 시 이용권을 먼저 예약하고, 성공 시 확정하며, 실패 시 예약을 해제한다.
- 유효한 구독 상태는 상품별 `subscriptions` 레코드로 판단한다.
- 결제 금액은 서버가 조회한 `plans.plan_price`를 기준으로 확정한다.
- 프론트가 전달한 가격과 상품명은 결제 승인 기준으로 사용하지 않는다.
- 결제 성공 URL 진입만으로 구독을 활성화하지 않는다.
- Toss 응답 검증과 로컬 DB 트랜잭션이 완료된 뒤에만 구독과 서비스 권한을 활성화한다.
- 자동결제 실패 즉시 해당 상품의 서비스 권한을 중단한다.
- 최초 자동결제 실패 후 1일째와 3일째에 각각 1회 자동 재시도한다.
- 두 번째 자동 재시도 실패 시 구독을 `EXPIRED`로 변경하고 이후 자동결제를 종료한다.
- 자동 재시도 성공 시 성공 시각부터 새 월 이용 기간을 시작하고 월 사용량을 새로 발급한다.
- 구독 해지는 즉시 서비스 중단이 아니다. 현재 결제 기간 종료 시점까지 서비스를 제공한다.
- 구독 해지와 환불은 별도 업무이다. 구독 해지는 이미 승인된 결제를 자동 환불하지 않는다.
- `billingKey`, Toss Secret Key, 카드 원문 정보는 프론트 응답·브라우저 저장소·애플리케이션 로그에 기록하지 않는다.

---

## 3. 상품별 회원 등급

`FREE/PREMIUM` 개념은 유지하되 `Member` 전체가 아니라 상품별 권한에 저장한다.

```text
회원 A
├─ document-coaching: FREE, freeRemaining=0
└─ interview: PREMIUM, subscriptionStatus=ACTIVE
```

| planType | 의미 |
|---|---|
| `FREE` | 해당 상품의 유료 구독이 없는 상태 |
| `PREMIUM` | 해당 상품에 유효한 구독 관계가 존재하는 상태 |

`FREE` 상태에서도 `freeRemaining=0`이면 서비스를 이용할 수 없다.

---

## 4. 상태 머신

### 4.1 무료 이용권 상태

```text
AVAILABLE -> RESERVED -> USED
                  |
                  +-> AVAILABLE

AVAILABLE -> FORFEITED
```

| 상태 | 의미 |
|---|---|
| `AVAILABLE` | 무료 1회 이용 가능 |
| `RESERVED` | AI 작업 진행 중으로 무료 이용권 예약 |
| `USED` | 최종 결과 생성 성공으로 무료 이용권 소진 |
| `FORFEITED` | 무료 이용 전 구독을 시작하여 무료 이용권 종료 |

### 4.2 구독 상태

```text
ACTIVE -> CANCEL_SCHEDULED -> EXPIRED
ACTIVE -> PAYMENT_FAILED -> ACTIVE
ACTIVE -> PAYMENT_FAILED -> EXPIRED
ACTIVE -> REFUND_PENDING -> REFUNDED
```

| 상태 | 서비스 권한 | 자동결제 |
|---|---:|---:|
| `ACTIVE` | 허용 | 실행 |
| `CANCEL_SCHEDULED` | 현재 기간 종료까지 허용 | 실행 안 함 |
| `PAYMENT_FAILED` | 즉시 차단 | 1일째·3일째 재시도 |
| `EXPIRED` | 차단 | 실행 안 함 |
| `REFUND_PENDING` | 차단 | 실행 안 함 |
| `REFUNDED` | 차단 | 실행 안 함 |

### 4.3 결제 상태

```text
READY -> AUTHORIZED -> CONFIRMING -> PAID
READY -> CANCELED
AUTHORIZED -> FAILED
CONFIRMING -> FAILED
CONFIRMING -> RECONCILING -> PAID
CONFIRMING -> RECONCILING -> FAILED
```

| 상태 | 의미 |
|---|---|
| `READY` | 결제 전 검증을 통과한 로컬 주문 |
| `AUTHORIZED` | Toss 자동결제 인증 완료 및 billingKey 발급 완료 |
| `CONFIRMING` | billingKey를 사용한 실제 결제 승인 요청 중 |
| `PAID` | 결제 후 검증 및 로컬 반영 완료 |
| `FAILED` | 결제 실패 확정 |
| `CANCELED` | 사용자가 인증·결제 흐름을 취소하거나 유효 시간(30분) 내 인증이 진행되지 않아 시스템이 자동 만료 |
| `RECONCILING` | Toss 결과와 로컬 DB 상태를 재확인하는 중 |

---

## 5. 결제 3단계 검증 원칙

### 5.1 결제 전 검증

- 로그인 회원과 `USER` 권한을 확인한다.
- 회원 상태가 `ACTIVE`인지 확인한다.
- 상품이 존재하고 판매 중인지 확인한다.
- 동일 상품의 `ACTIVE`, `CANCEL_SCHEDULED`, `PAYMENT_FAILED` 구독 존재 여부를 확인한다.
- 상품 가격과 통화를 DB에서 확정한다.
- 자동결제 약관 동의 버전을 저장한다.
- 서버에서 `orderId`와 `idempotencyKey`를 생성한다.
- 검증 완료 후 `READY` 주문을 저장한다.

### 5.2 결제 중 검증

- `orderId`가 현재 회원 소유인지 확인한다.
- 주문 상태가 `READY`인지 확인한다.
- Toss가 전달한 `customerKey`가 현재 회원의 서버 발급 키와 일치하는지 확인한다.
- `authKey` 재사용을 금지한다.
- billingKey는 서버에서 발급받아 암호화 저장한다.
- 실제 결제 금액은 로컬 주문 금액을 사용한다.
- 동일 주문의 결제 승인 요청을 한 번만 실행한다.

### 5.3 결제 후 검증

- Toss 결제 상태가 결제 완료 상태인지 확인한다.
- `orderId`, 금액, 통화, customerKey가 로컬 주문과 일치하는지 확인한다.
- `paymentKey`와 `orderId`의 중복 처리 여부를 확인한다.
- 검증 완료 후 단일 DB 트랜잭션에서 결제·구독·권한·월 사용량을 반영한다.
- 로컬 반영이 완료되기 전에는 서비스 권한을 열지 않는다.
- Toss 결제 성공 후 로컬 반영 실패 시 `RECONCILING`으로 전환하고 대사 작업으로 복구한다.

---

## 6. 도메인 경계

### Subscription/Billing 담당

- 상품과 가격 조회
- 상품별 FREE/PREMIUM 권한 관리
- 무료 이용권 예약·확정·해제
- 구독 월 사용량 예약·확정·해제
- Toss billingKey 발급 및 암호화 저장
- 최초 결제, 자동결제, 결제 재시도
- 구독 상태, 해지, 결제 내역
- 공통 권한 오류코드 제공

### Resume 담당

- `Document` 생성 시 문서 상품 이용 권한 예약
- 분석 완료 Webhook에서 이용 확정
- 분석 실패 경로에서 예약 해제

### Interview 담당

- `InterviewSession` 생성 시 면접 상품 이용 권한 예약
- 최종 리포트 저장 성공 시 이용 확정
- 세션 실패·타임아웃 경로에서 예약 해제

### Frontend 연동 기준

- Backend 계약의 기준은 현재 아래 화면과 버튼 구현이다.
  - `/mypage/subscription`
  - `/mypage/payment-history`
  - `/billing/checkout`
  - `/billing/success`
  - `/billing/fail`
- 현재 버튼의 route와 사용자 동작을 유지한다.
  - `서류 AI 코칭 체험하기` → `/documents/resume`
  - `AI 모의면접 체험하기` → `/interview`
  - 상품 카드 `구매하기` → `/billing/checkout?product={productCode}`
  - 추천 카드 CTA → `/billing/checkout?product={productCode}`
  - `Toss Payments로 결제하기` → 현재 checkout 화면 안에서 결제 시작
  - `구독 해지` → 현재 confirm modal 표시 후 cancel API 호출
  - `다시 결제하기` → 동일 상품 checkout으로 이동
  - `AI 서비스로 이동/돌아가기` → `/mypage/subscription`
  - `구독/결제 내역 보기` → `/mypage/payment-history`
- Backend는 현재 화면이 읽는 필드를 제거하거나 이름을 변경하지 않는다.
- Backend 신규 필드는 기존 필드를 유지한 상태에서만 추가한다.

---

## 7. 금지 패턴

- Backend 구현 편의를 위해 현재 Frontend UI·버튼·route를 수정하는 것을 금지한다.
- 사용자 승인 없이 버튼 문구, 버튼 클릭 결과, modal 흐름, success/fail 페이지 이동을 변경하는 것을 금지한다.
- `Member.subscriptionStatus == PREMIUM`만으로 두 상품 권한을 동시에 허용하는 것을 금지한다.
- AI 서비스 Controller에서 무료 횟수를 직접 감소시키는 것을 금지한다.
- AI 작업 시작 전에 이용 권한을 차감 확정하는 것을 금지한다.
- 프론트가 전달한 금액으로 Toss 결제를 요청하는 것을 금지한다.
- success URL 파라미터만 확인하고 구독을 생성하는 것을 금지한다.
- 자동결제 실패 후 서비스 권한을 유지하는 것을 금지한다.
- 자동결제 실패 후 지정되지 않은 추가 재시도를 실행하는 것을 금지한다.
- 동일 `resourceId`에 사용 기록을 두 건 이상 생성하는 것을 금지한다.
- 외부 Toss API 호출을 긴 DB 트랜잭션 안에서 실행하는 것을 금지한다.
- billingKey와 Secret Key를 평문 DB 컬럼 또는 로그에 남기는 것을 금지한다.

---

## 8. Admin Payment 연동 필수 정렬 원칙

user 측 `payments`, `subscriptions` 테이블은 admin 측 `AdminPaymentController`, `AdminSubscriptionController`가 직접 읽고 쓴다.  
두 패키지가 같은 DB 테이블을 공유하므로 아래 항목은 코딩 스타일이 아닌 **연동 필수 조건**이다.

### 8.1 Enum 문자열 값 고정

아래 enum 값은 DB `CHECK constraint`로 고정되어 있다. user 측 엔티티에서 이 문자열과 다른 값을 사용하면 DB가 INSERT를 거부한다.

| DB 컬럼 | 허용 값 (변경 금지) |
|---|---|
| `payment_status` | `READY`, `AUTHORIZED`, `CONFIRMING`, `PAID`, `FAILED`, `CANCELED`, `RECONCILING`, `REFUNDED` |
| `payment_type` | `MANUAL`, `AUTO_RENEWAL` |
| `failure_reason` | `USER_CANCELED`, `CARD_DECLINED`, `TIMEOUT`, `DUPLICATE_ORDER`, `CONFIRM_FAILED`, `FORBIDDEN`, `UNKNOWN` |
| `subscription_status` | `ACTIVE`, `CANCEL_SCHEDULED`, `PAYMENT_FAILED`, `EXPIRED`, `REFUND_PENDING`, `REFUNDED` |

- user 측 `PaymentFailureReason` enum 값은 위 `failure_reason` 허용 값과 동일하게 유지한다.
- user 측 신규 Payment 엔티티의 `@Enumerated(EnumType.STRING)` 컬럼은 위 값 외 다른 문자열을 생성하지 않는다.

### 8.2 Payment 엔티티 컬럼명 정렬

user 측 Payment 엔티티의 `@Column(name = "...")` 값은 `admin.payment.entity.Payment` 및 `db/init.sql`의 컬럼명과 동일해야 한다.

| 필드 | DB 컬럼명 (변경 금지) |
|---|---|
| paymentId | `payment_id` |
| memberId | `member_id` |
| subscriptionId | `subscription_id` |
| planId | `plan_id` |
| orderId | `order_id` |
| paymentKey | `payment_key` |
| idempotencyKey | `idempotency_key` |
| amount | `amount` |
| currency | `currency` |
| paymentStatus | `payment_status` |
| failureReason | `failure_reason` |
| paymentMethod | `payment_method` |
| paymentType | `payment_type` |
| attemptSequence | `attempt_sequence` |
| approvedAt | `approved_at` |
| expiresAt | `expires_at` |
| createdAt | `created_at` |
| updatedAt | `updated_at` |

### 8.3 상태 전이 책임 분리

admin과 user 측이 동일한 Payment 레코드에 쓰는 상태 전이 경로가 겹치지 않도록 책임을 나눈다.

| 담당 | 허용 전이 |
|---|---|
| user 측 | `READY → AUTHORIZED → CONFIRMING → PAID` |
| user 측 | `READY → CANCELED` |
| user 측 | `AUTHORIZED / CONFIRMING / RECONCILING → FAILED` |
| user 측 | `CONFIRMING → RECONCILING → PAID` |
| **admin 측** | `PAID → REFUNDED` |

- user 측은 `PAID → REFUNDED` 전이를 실행하지 않는다.
- admin 측은 `READY` 이후 결제 진행 전이를 실행하지 않는다.
- 두 쪽 모두 자신이 담당하지 않는 상태에서 전이를 시도하면 예외를 발생시켜 DB 데이터 이상을 방지한다.

### 8.4 Toss 외부 API 실패 이력 격리

Toss API 호출 실패 이력은 주 트랜잭션이 롤백되더라도 반드시 DB에 남아야 한다.

- Toss 호출 실패 이력 저장은 `@Transactional(propagation = Propagation.REQUIRES_NEW)` 별도 트랜잭션으로 격리한다.
- 별도 `*TxService` 클래스에 격리 메서드를 위치시킨다 (예: `PaymentFailureTxService`).
- 주 트랜잭션 롤백 시 실패 이력이 함께 사라지는 구현을 금지한다.

---

## 9. 초안 결정 필요 항목

아래 값은 구현 전 팀 결정 후 숫자 하나로 확정한다.

| 항목 | 현재 상태 |
|---|---|
| `document-coaching` 월 가격 | 미확정 |
| `interview` 월 가격 | 미확정 |
| `document-coaching` 월 제공 횟수 | 미확정 |
| `interview` 월 제공 횟수 | 미확정 |
| 결제일이 다음 달에 존재하지 않을 때의 청구일 계산 규칙 | 미확정 |
| 환불 신청 가능 기간과 이용량 기준 | admin/payment 협의 필요 |

### Frontend 내부 결제 호출 승인 필요

현재 checkout의 `Toss Payments로 결제하기` 버튼은 Toss SDK `requestPayment()`를 호출한다.
이 방식은 일반 단건 결제이며, 본 스펙에서 확정한 billingKey 월 자동결제와 동일한 흐름이 아니다.

다음 항목은 사용자 승인 전 변경하지 않는다.

- 버튼 UI·문구·위치·disabled 동작은 그대로 유지
- 버튼 `onClick` 내부 Toss SDK 호출을 billing authorization 방식으로 변경
- success redirect에서 읽는 Toss 파라미터를 자동결제 인증 파라미터로 변경
- Frontend 내부 confirm request DTO 매핑 변경

Backend만으로 `requestPayment()`를 billingKey 자동결제로 변환할 수 없으므로,
이 내부 연동 변경은 실제 구현 전 별도 승인을 받아야 한다.
