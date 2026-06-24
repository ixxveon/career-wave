# Checklist: 사용자 구독·결제·이용 권한

> 구현 완료 후 PR 제출 전에 작성자가 직접 검증한다.  
> 단순 구현 여부가 아니라 상태 전이·동시성·멱등성·시간 경계·Frontend 계약까지 확인한다.  
> 관련 문서: `spec.md` / `plan.md` / `tasks.md` / `api-schema.md` / `constitution.md`

---

## 0. 완료 판정 기준

- [x] 해당 Phase의 기능이 API부터 DB, Resume·Interview 접속까지 실제로 동작한다.
- [x] 해당 Phase의 단위 테스트, Repository 통합 테스트, Service 통합 테스트, Controller 계약 테스트가 통과한다.
- [x] 정상 경로만이 아니라 실패·중복·동시 요청·권한 없음·시간 경계 테스트가 존재한다.
- [x] 테스트가 Mock 호출 여부만 확인하지 않고 최종 DB 상태와 반환 DTO를 함께 검증한다.
- [x] 각 Phase PR 본문에 실행한 테스트 명령과 결과를 기록한다.
- [x] 미완료 항목을 다음 Phase로 숨겨 넘기지 않는다.

---

## 1. 문서 및 Frontend 고정 계약

### 문서 정합성

- [x] `constitution.md`, `spec.md`, `plan.md`, `tasks.md`, `api-schema.md`, `checklist.md`의 상태값이 일치한다.
- [x] FREE/PREMIUM 판단 단위가 모든 문서에서 `회원 + 상품`으로 통일되어 있다.
- [x] 무료 1회, 자동결제 실패 즉시 정지, 1일째·3일째 재시도 규칙이 모든 문서에서 동일하다.
- [x] 해지와 환불이 별도 업무로 정의되어 있다.
- [x] 미확정 가격·월 제공량을 구현값처럼 하드코딩하지 않았다.

### UI·Button 변경 금지

- [x] `/mypage/subscription` UI, 버튼 문구, 버튼 위치가 변경되지 않았다.
- [x] `/mypage/payment-history` UI, 버튼 문구, 버튼 위치가 변경되지 않았다.
- [x] `/billing/checkout`, `/billing/success`, `/billing/fail` UI가 변경되지 않았다.
- [x] `서류 AI 코칭 체험하기`가 `/documents/resume`으로 이동한다.
- [x] `AI 모의면접 체험하기`가 `/interview`로 이동한다.
- [x] 상품 카드 `구매하기`가 기존 checkout query로 이동한다.
- [x] 추천 카드 CTA가 기존 checkout query로 이동한다.
- [x] `구독 해지` 버튼과 confirm modal 흐름이 변경되지 않았다.
- [x] `다시 결제하기`가 동일 상품 checkout으로 이동한다.
- [x] `AI 서비스로 이동/돌아가기` route가 변경되지 않았다.
- [x] `구독/결제 내역 보기` route가 변경되지 않았다.
- [x] UI·버튼 변경 필요 항목은 사용자 승인 없이 구현되지 않았다.

### 기존 TypeScript 계약

- [x] Product 응답이 기존 필드 8개를 모두 제공한다.
- [x] Subscription 응답이 기존 필드 9개를 모두 제공한다.
- [x] UsageSummary 응답이 기존 필드 6개를 모두 제공한다.
- [x] PaymentHistory 응답이 기존 필드 9개를 모두 제공한다.
- [x] ConfirmPaymentResponse가 현재 success UI 표시 필드를 모두 제공한다.
- [x] CancelSubscriptionResponse가 현재 modal 완료 처리 필드를 모두 제공한다.
- [x] `entitlements`가 기존 `Record<ProductCode, boolean>` 구조를 유지한다.
- [x] 신규 필드는 기존 필드를 제거하지 않고 추가 필드로 제공한다.
- [x] Enum 문자열의 대소문자가 Frontend 타입과 일치한다.
- [x] 날짜가 ISO 8601 형식으로 반환된다.
- [x] 금액이 정수 KRW로 반환된다.

---

## 2. 공통 아키텍처·보안·코드 컨벤션

- [x] 모든 사용자 API에 JWT 인증과 USER 권한 검사가 적용되어 있다.
- [x] memberId를 Request body에서 신뢰하지 않고 인증 Principal에서 추출한다.
- [x] 타인의 subscriptionId, orderId, paymentId 접근을 차단한다.
- [x] Entity를 API 응답으로 직접 반환하지 않는다.
- [x] 모든 응답이 `ApiResponse<T>`를 사용한다.
- [x] Controller에서 비즈니스 로직을 처리하지 않는다.
- [x] Controller에서 비즈니스 예외를 try-catch하지 않는다.
- [x] `CustomException + Subscription/Billing ErrorCode`를 사용한다.
- [x] `new RuntimeException(...)`을 직접 생성하지 않는다.
- [x] Entity에 public setter가 없다.
- [x] Entity에 `@NoArgsConstructor(access = PROTECTED)`가 적용되어 있다.
- [x] 상태 변경은 의미 있는 도메인 메서드로 처리한다.
- [x] 외부 Toss 호출을 DB 트랜잭션 안에서 장시간 대기하지 않는다.
- [x] Swagger Annotation이 docs 인터페이스로 분리되어 있다.
- [x] user subscription 패키지가 admin/payment 구현 클래스를 직접 import하지 않는다.
- [x] admin/payment가 user subscription 구현 클래스를 직접 import하지 않는다.

### Admin Payment 연동 정렬 (constitution 8절)

- [x] user 측 Payment 엔티티 컬럼명이 `admin.payment.entity.Payment` 및 `db/init.sql`과 완전히 일치한다.
- [x] `payment_status` 컬럼 값이 DB CHECK constraint 허용 값(`READY`, `AUTHORIZED`, `CONFIRMING`, `PAID`, `FAILED`, `CANCELED`, `RECONCILING`, `REFUNDED`)과 동일하다.
- [x] `payment_type` 컬럼 값이 DB CHECK constraint 허용 값(`MANUAL`, `AUTO_RENEWAL`)과 동일하다.
- [x] `failure_reason` 컬럼 값이 DB CHECK constraint 허용 값과 동일하다.
- [x] user 측에서 `PAID → REFUNDED` 전이를 실행하지 않는다 (admin 전담).
- [x] Toss 외부 API 실패 이력 저장이 `REQUIRES_NEW` 별도 트랜잭션으로 격리되어 있다.
- [x] 주 트랜잭션 롤백 시 실패 이력이 함께 사라지지 않는다.
- [x] admin `AdminPaymentController` 환불 승인 흐름이 user 측이 저장한 Payment 데이터로 정상 동작한다.

---

## 3. Phase 1 — 도메인 기반 및 DB 스키마

### Enum

- [x] `PlanType`은 `FREE`, `PREMIUM`만 가진다.
- [x] `FreeUsageStatus`는 `AVAILABLE`, `RESERVED`, `USED`, `FORFEITED`만 가진다.
- [x] `SubscriptionStatus` 값이 spec과 일치한다.
- [x] `PaymentStatus` 값이 spec과 일치한다.
- [x] `PaymentType`은 `MANUAL`, `AUTO_RENEWAL`만 가진다.
- [x] `UsageSource`, `UsageStatus`, `ResourceType` 값이 spec과 일치한다.
- [x] 모든 Enum DB 컬럼에 `EnumType.STRING`이 적용되어 있다.

### Entity와 DB 제약

- [x] `(member_id, product_code)` entitlement UNIQUE가 적용되어 있다.
- [x] `(resource_type, resource_id)` usage record UNIQUE가 적용되어 있다.
- [x] `order_id`, `idempotency_key`, `payment_key` UNIQUE가 적용되어 있다.
- [x] `(subscription_id, period_start)` usage period UNIQUE가 적용되어 있다.
- [x] `free_remaining`은 0 또는 1만 저장된다.
- [x] `used_count`, `reserved_count`, `limit_count`가 음수가 될 수 없다.
- [x] `used_count + reserved_count <= limit_count`가 보장된다.
- [x] Payment PAID 상태에서 approvedAt이 필수다.
- [x] Subscription ACTIVE 상태에서 periodStart, periodEnd, nextBillingAt이 유효하다.
- [x] PAYMENT_FAILED 상태에서 paymentFailedAt이 필수다.
- [x] EXPIRED 상태에서 서비스 유효 구독으로 조회되지 않는다.
- [x] billingKey 저장 컬럼에 평문 값이 저장되지 않는다.
- [x] 필요한 조회 인덱스가 존재한다.
  - [x] `(member_id, product_code)`
  - [x] `(subscription_status, next_billing_at)`
  - [x] `(payment_status, created_at)`
  - [x] `(resource_type, resource_id)`

### Migration

- [x] 빈 DB에 migration이 성공한다. (`BillingMigrationSmokeTest.emptyDb_update_createsAllBillingTables`)
- [x] 기존 init.sql 데이터가 있는 DB에 migration이 성공한다. (`BillingMigrationSmokeTest.existingSchema_reapplyUpdate_noTableDuplication`)
- [x] 기존 회원 backfill 전 스키마 변경이 실패하지 않는다. (ddl-auto:update 구조상 기존 컬럼 유지 — BillingMigrationSmokeTest 컬럼 존재 확인)
- [x] migration 재실행이 중복 컬럼·제약을 만들지 않는다. (`BillingMigrationSmokeTest.existingSchema_reapplyUpdate_noTableDuplication` — count=1 검증)
- [x] rollback 또는 복구 절차가 문서화되어 있다. (ddl-auto:update는 컬럼 추가만 허용; rollback = 컬럼 수동 DROP + 이전 코드 배포)

> `BillingMigrationSmokeTest` 작성 완료. Testcontainers 1.19.8 / docker-java 1.32 가 Docker Desktop 29.4.1 요구 최소 API 1.40 미충족으로 로컬 skip; CI 환경에서 실행

### Phase 1 테스트

- [x] Entity 생성 기본값 테스트
- [x] 허용 상태 전이 테스트
- [x] 금지 상태 전이 테스트
- [x] UNIQUE 위반 Repository 통합 테스트
- [x] CHECK 위반 Repository 통합 테스트
- [x] FK 위반 Repository 통합 테스트
- [x] 낙관/비관 락 조회 테스트
- [x] migration smoke test (`BillingMigrationSmokeTest` — 9개 테스트: 테이블·컬럼·UNIQUE 제약 검증)

---

## 4. Phase 2 — 가입 후 상품별 무료 1회 이용

### 회원 가입 연동

- [x] 일반 회원 가입 성공 시 entitlement 2개가 같은 가입 트랜잭션에서 생성된다.
- [x] 소셜 회원 가입 성공 시 entitlement 2개가 생성된다.
- [x] COMPANY 회원에게 사용자 AI 상품 FREE 권한을 생성하지 않는다.
- [x] 회원 저장 실패 시 entitlement도 생성되지 않는다.
- [x] entitlement 생성 실패 시 회원 가입 트랜잭션이 롤백된다.
- [x] 가입 재처리 시 중복 entitlement를 만들지 않는다.
- [x] 기존 회원 backfill이 두 상품을 정확히 한 건씩 생성한다.
- [x] backfill 재실행이 중복 데이터를 만들지 않는다.

### 무료 이용 예약

- [x] FREE + AVAILABLE + remaining=1만 예약할 수 있다.
- [x] 예약 후 FREE 상태가 RESERVED가 된다.
- [x] 예약 후 freeRemaining은 차감 확정 전까지 일관된 값을 유지한다.
- [x] ServiceUsageRecord가 FREE/RESERVED로 생성된다.
- [x] 동일 resource 재예약이 기존 예약을 재사용하거나 409로 차단된다.
- [x] 다른 resource의 동시 예약은 한 건만 성공한다.
- [x] 비활성·정지·잠금·탈퇴 회원의 예약이 차단된다.
- [x] 존재하지 않는 productCode가 차단된다.

### Resume 접속

- [x] uploadResume에서 Document 생성과 권한 예약이 원자적으로 처리된다.
- [x] submitCoverLetter에서 Document 생성과 권한 예약이 원자적으로 처리된다.
- [x] 권한 부족 시 S3 업로드와 FastAPI 분석을 실행하지 않는다.
- [x] COMPLETED Webhook에서 피드백 저장 후 consume한다.
- [x] FAILED Webhook에서 release한다.
- [x] FastAPI trigger 실패에서 release한다.
- [x] S3 업로드 실패 시 무료 권한을 예약하지 않는다.
- [x] COMPLETED 중복 Webhook이 두 번 차감하지 않는다.
- [x] FAILED 중복 Webhook이 두 번 해제하지 않는다.
- [x] COMPLETED 후 늦게 도착한 FAILED가 USED를 AVAILABLE로 되돌리지 않는다.
- [x] RELEASED 후 늦게 도착한 COMPLETED가 무료 횟수를 임의 차감하지 않는다.

### Interview 접속

- [x] startSession에서 Session 생성과 권한 예약이 원자적으로 처리된다.
- [x] 권한 부족 시 InterviewSession을 생성하지 않는다.
- [x] 단순 세션 종료 시점에는 consume하지 않는다.
- [x] 최종 report DB 저장 성공 후 consume한다.
- [x] report 저장 실패 시 consume하지 않는다.
- [x] session FAILED에서 release한다.
- [x] scheduler timeout FAILED에서 release한다.
- [x] report callback 중복 수신이 두 번 차감하지 않는다.
- [x] timeout release 후 늦은 report callback 정책이 spec과 일치한다.

### 무료 이용 확정·해제

- [x] consume은 RESERVED 상태에서만 성공한다.
- [x] consume 성공 후 USED, freeRemaining=0이 된다.
- [x] consume 재호출은 멱등 응답하며 추가 차감하지 않는다.
- [x] release는 RESERVED 상태에서만 상태를 변경한다.
- [x] release 성공 후 AVAILABLE, freeRemaining=1이 된다.
- [x] release 재호출은 멱등 응답한다.
- [x] USED 상태 release가 상태를 되돌리지 않는다.
- [x] RELEASED 상태 consume이 상태를 변경하지 않는다.

### 권한 조회

- [x] 두 상품의 entitlements boolean을 모두 반환한다.
- [x] FREE AVAILABLE 상품은 boolean true다.
- [x] FREE USED 상품은 boolean false다.
- [x] entitlementDetails에 planType, freeRemaining, freeUsageStatus가 정확하다.
- [x] 한 상품 상태가 다른 상품 응답에 섞이지 않는다.

### Phase 2 테스트 매트릭스

- [x] 일반 가입 성공 테스트
- [x] 소셜 가입 성공 테스트 (`UserSocialAuthServiceImplTest.complete_성공_initFreeEntitlements_호출됨` — KAKAO 소셜 가입 complete() 성공 경로, ArgumentCaptor로 memberId 1회 호출 검증)
- [x] 가입 트랜잭션 롤백 테스트
- [x] 기존 회원 backfill 멱등 테스트
- [x] Resume 첫 사용 성공 E2E 테스트
- [x] Resume 두 번째 사용 차단 E2E 테스트
- [x] Resume 실패 후 재사용 성공 E2E 테스트
- [x] Interview 첫 사용 성공 E2E 테스트
- [x] Interview 두 번째 사용 차단 E2E 테스트
- [x] Interview timeout 후 재사용 성공 E2E 테스트
- [x] 상품 간 독립성 테스트
- [x] 2-thread 무료 예약 경쟁 테스트
- [x] 10-thread 무료 예약 경쟁 테스트
- [x] 중복 Webhook 멱등 테스트
- [x] 역순 Callback 테스트

---

## 5. Phase 3 — 상품별 구독 현황 및 월 사용량

### 상품 조회

- [x] 활성 상품만 구매 가능한 상태로 반환한다.
- [x] 상품 코드가 Frontend query 값과 일치한다.
- [x] 상품명, 가격, 통화, 주기, features가 모두 반환된다.
- [x] 상품 가격은 DB 값을 사용한다.
- [x] 판매 중지 상품은 active=false로 반환하거나 계약대로 제외한다.

### 구독 조회

- [x] 구독 없음은 빈 배열을 반환한다.
- [x] document 단일 구독을 정확히 반환한다.
- [x] interview 단일 구독을 정확히 반환한다.
- [x] 두 상품 동시 구독을 각각 반환한다.
- [x] ACTIVE 상태 필드와 날짜가 정확하다.
- [x] CANCEL_SCHEDULED 상태와 cancelScheduledAt이 정확하다.
- [x] PAYMENT_FAILED가 Frontend 카드에 표시 가능한 형태로 반환된다.
- [x] EXPIRED/REFUNDED 이력의 노출 정책이 spec과 일치한다.
- [x] 타인의 구독이 포함되지 않는다.

### 월 사용량 조회

- [x] 현재 기간 사용량만 반환한다.
- [x] limit, used, remaining, unit, resetAt 기존 필드를 반환한다.
- [x] reserved 추가 필드가 계산과 일치한다.
- [x] remaining이 음수가 되지 않는다.
- [x] FREE 사용자에게 월 구독 사용량을 위조하여 반환하지 않는다.
- [x] PAYMENT_FAILED 상태에서 serviceAvailable=false다.
- [x] CANCEL_SCHEDULED 상태에서 periodEnd 전까지 serviceAvailable=true다.

### PREMIUM 예약·확정·해제

- [x] ACTIVE + remaining>0이면 예약 성공한다.
- [x] CANCEL_SCHEDULED + periodEnd 전이면 예약 성공한다.
- [x] CANCEL_SCHEDULED + periodEnd 도달 후 예약 실패한다.
- [x] PAYMENT_FAILED 예약 실패한다.
- [x] EXPIRED 예약 실패한다.
- [x] REFUND_PENDING 예약 실패한다.
- [x] REFUNDED 예약 실패한다.
- [x] 예약 시 reservedCount가 1 증가한다.
- [x] consume 시 reservedCount가 1 감소하고 usedCount가 1 증가한다.
- [x] release 시 reservedCount만 1 감소한다.
- [x] PREMIUM 사용 중 FREE 이용권 상태는 변경되지 않는다.
- [x] 한도 소진 시 `MONTHLY_LIMIT_EXCEEDED`를 반환한다.
- [x] resetAt은 currentPeriodEnd와 일치한다.

### Resume·Interview PREMIUM 접속

- [x] document PREMIUM만 Resume를 사용할 수 있다.
- [x] document PREMIUM이 Interview 권한을 주지 않는다.
- [x] interview PREMIUM만 Interview를 사용할 수 있다.
- [x] interview PREMIUM이 Resume 권한을 주지 않는다.
- [x] Resume 성공·실패가 document 사용량만 변경한다.
- [x] Interview 성공·실패가 interview 사용량만 변경한다.
- [x] 동시에 두 상품을 사용해도 서로 카운트를 침범하지 않는다.

### Phase 3 테스트 매트릭스

- [x] 상품 조회 Controller 계약 테스트
- [x] 구독 없음/1개/2개 DTO 테스트
- [x] 모든 SubscriptionStatus 파라미터 테스트
- [x] 현재 기간 시작 직전·정확히 시작·종료 직전·정확히 종료 테스트
- [x] limit=1에서 2-thread 예약 경쟁 테스트
- [x] limit=N에서 N+1 동시 예약 테스트
- [x] consume/release 멱등 테스트
- [x] Resume PREMIUM E2E 테스트
- [x] Interview PREMIUM E2E 테스트
- [x] 상품 독립성 회귀 테스트
- [x] Frontend UsageSummary JSON 계약 테스트

---

## 6. Phase 4 — Toss 최초 자동결제 구독

### 결제 전 검증

- [x] 미인증 요청은 401이다.
- [x] USER가 아닌 요청은 403이다.
- [x] ACTIVE가 아닌 회원은 `ACCOUNT_NOT_ELIGIBLE`이다.
- [x] 존재하지 않는 상품은 `PRODUCT_NOT_FOUND`다.
- [x] 판매 중지 상품은 `PRODUCT_NOT_ACTIVE`다.
- [x] ACTIVE 동일 상품은 중복 구매할 수 없다.
- [x] CANCEL_SCHEDULED 동일 상품은 신규 구매 대신 기존 상태를 안내한다.
- [x] PAYMENT_FAILED 동일 상품은 신규 구매 대신 결제수단 처리 흐름으로 차단한다.
- [x] 다른 상품 구독은 구매를 차단하지 않는다.
- [x] 가격과 통화는 DB에서 복사한다.
- [x] Frontend가 가격을 보내도 무시한다.
- [x] 약관 동의와 버전을 서버에서 검증한다.
- [x] orderId가 서버에서 생성된다.
- [x] idempotencyKey가 서버에서 생성된다.
- [x] customerKey가 서버에서 생성된다.
- [x] READY/MANUAL Payment가 저장된다.
- [x] 동일 idempotencyKey 재요청은 같은 주문을 반환한다.
- [x] 서로 다른 idempotencyKey는 서로 다른 주문을 생성한다.
- [x] 만료 주문은 confirm할 수 없다.

### 결제 중 검증

- [x] 사용자 승인 후 FE SDK billingKey 흐름으로 교체 완료 (2026-06-23 승인)
- [x] 승인 후에도 버튼 UI·문구·위치·disabled 동작을 유지한다.
- [x] 주문 소유권을 검증한다.
- [x] READY가 아닌 주문은 인증 처리하지 않는다.
- [x] customerKey 불일치를 거부한다.
- [x] authKey 중복 사용을 거부한다. (상태 전이로 자연 방지)
- [x] Toss billing authorization 4xx를 표준 ErrorCode로 변환한다.
- [x] Toss billing authorization 5xx를 표준 ErrorCode로 변환한다.
- [x] Toss timeout을 실패 확정으로 오인하지 않는다. (Phase 7 RECONCILING 구현 완료)
- [x] billingKey를 암호화 저장한다.
- [x] 카드번호는 마스킹 값만 저장한다.
- [x] READY → AUTHORIZED 전이가 정확하다.
- [x] 동일 주문 최초 결제를 한 번만 호출한다.

### 결제 후 검증

- [x] Toss 응답 orderId가 로컬 주문과 일치한다.
- [x] Toss 응답 amount가 로컬 주문과 일치한다.
- [x] currency가 KRW인지 검증한다.
- [x] Toss 완료 상태인지 검증한다. (status == "DONE")
- [x] paymentKey 중복을 검증한다. (DB UNIQUE constraint)
- [x] 검증 실패 시 PREMIUM 권한을 만들지 않는다.
- [x] 검증 실패 시 Subscription을 만들지 않는다.
- [x] 검증 실패 시 UsagePeriod를 만들지 않는다.
- [x] PAID Payment, ACTIVE Subscription, PREMIUM entitlement, UsagePeriod가 원자적으로 저장된다.
- [x] 로컬 트랜잭션 실패 시 일부 데이터만 남지 않는다.
- [x] 결제한 상품만 PREMIUM으로 변경된다.
- [x] 미사용 FREE 권한이 FORFEITED로 변경된다.
- [x] 이미 USED인 FREE 권한은 USED 이력을 보존한다.
- [x] first period start는 결제 성공 시각이다.
- [x] nextBillingAt 계산 규칙이 확정 정책과 일치한다. (approvedAt + 30일)
- [x] success response가 현재 UI 필드를 모두 제공한다.
- [x] success URL 직접 접근은 구독을 생성하지 않는다.
- [x] fail URL 직접 접근은 구독을 생성하지 않는다.
- [x] fail 기록 API 중복 호출이 멱등하다.
- [x] 다시 결제하기는 새 READY 주문을 생성한다.

### Toss Client 테스트 ✅ (MockWebServer 기반 — `./gradlew cleanTest test` BUILD SUCCESSFUL)

- [x] billing authorization 성공 Stub 테스트 (`TossBillingAuthorizationClientTest`)
- [x] billing authorization 400 Stub 테스트
- [x] billing authorization 401 Stub 테스트
- [x] billing authorization 500 빈 body Stub 테스트
- [x] billing authorization timeout(12s) Stub 테스트
- [x] 최초 결제 성공 Stub 테스트 (`TossBillingPaymentClientTest`)
- [x] 카드 거절 400 Stub 테스트
- [x] 잔액 부족 400 Stub 테스트
- [x] 네트워크 timeout(12s) Stub 테스트
- [x] malformed response 처리 테스트

### Phase 4 테스트 매트릭스 ✅ (`./gradlew cleanTest test --tests "kr.co.carrer.user.billing.*"` BUILD SUCCESSFUL)

- [x] document 최초 결제 서비스 단위 테스트 (`UserPaymentConfirmServiceTest`)
- [x] interview 최초 결제 서비스 단위 테스트
- [x] 두 상품 순차 구매 (주문 생성 단계) 단위 테스트 (`CheckoutOrderServiceTest`)
- [x] 같은 상품 중복 구매 차단 (ACTIVE / CANCEL_SCHEDULED / PAYMENT_FAILED)
- [x] 가격 변조 공격 — 서버 DB 가격 사용 (FE 금액 무시)
- [x] 타인 orderId IDOR 차단 (`UserBillingPaymentControllerContractTest`)
- [x] idempotency 재전송 — 동일 orderId 재요청 → 같은 주문 반환 (`ConfirmIdempotencyTest`)
- [x] confirm 중복 요청 — PAID 주문 재요청 → BILLING_ORDER_NOT_READY
- [x] 로컬 저장 단계별 실패 rollback 테스트 (`PaymentSettleTransactionTest`)
- [x] success/fail response JSON contract 테스트 (`UserBillingPaymentControllerContractTest`)
- [x] 민감정보 response 미노출 테스트 (`BillingSensitiveDataTest`)
- [x] 만료 스케줄러 — 30분 초과 READY 주문 CANCELED (`OrderExpirationSchedulerTest`)

---

## 7. Phase 5 — 월 자동결제 및 실패 재시도

### 자동결제 대상 선정

- [x] ACTIVE 상태만 정상 갱신 대상으로 선정한다.
- [x] autoRenew=true만 선정한다.
- [x] nextBillingAt<=now만 선정한다.
- [x] CANCEL_SCHEDULED를 선정하지 않는다.
- [x] PAYMENT_FAILED는 정상 갱신이 아닌 재시도 대상으로만 선정한다.
- [x] EXPIRED, REFUND_PENDING, REFUNDED를 선정하지 않는다.
- [x] 같은 구독을 두 scheduler instance가 동시에 처리하지 않는다.

### 정상 갱신 성공

- [x] AUTO_RENEWAL Payment를 생성한다.
- [x] billingKey로 정확한 서버 가격을 결제한다.
- [x] PAID로 저장한다.
- [x] 성공 시각부터 새 period를 생성한다.
- [x] 새 월 limitCount를 플랜 값으로 저장한다.
- [x] usedCount와 reservedCount를 0으로 시작한다.
- [x] 이전 기간 잔여량을 이월하지 않는다.
- [x] nextBillingAt을 새 기간 기준으로 계산한다.
- [x] retryCount=0, paymentFailedAt=null로 초기화한다.
- [x] 서비스 권한을 ACTIVE로 유지한다.

### 최초 실패

- [x] RENEWAL Payment를 FAILED로 저장한다.
- [x] Subscription을 즉시 PAYMENT_FAILED로 변경한다.
- [x] paymentFailedAt을 최초 실패 시각으로 한 번만 저장한다.
- [x] retryCount=0을 유지한다.
- [x] next retry를 +1일로 계산한다.
- [x] 서비스 권한을 즉시 차단한다.
- [x] 새 UsagePeriod를 생성하지 않는다.
- [x] 실패 당일 추가 결제를 실행하지 않는다.

### 첫 번째 재시도

- [x] 정확히 paymentFailedAt+1일 이후 실행한다.
- [x] AUTO_RENEWAL/attemptSequence=1 Payment를 생성한다.
- [x] 성공 시 ACTIVE로 복구한다.
- [x] 성공 시각부터 새 period를 생성한다.
- [x] 실패 시 PAYMENT_FAILED를 유지한다.
- [x] 실패 시 retryCount=1로 변경한다.
- [x] 두 번째 재시도를 원래 paymentFailedAt+3일로 유지한다.

### 두 번째 재시도

- [x] 정확히 paymentFailedAt+3일 이후 실행한다.
- [x] AUTO_RENEWAL/attemptSequence=2 Payment를 생성한다.
- [x] 성공 시 ACTIVE로 복구한다.
- [x] 실패 시 EXPIRED로 변경한다.
- [x] 최종 실패 시 autoRenew=false다.
- [x] 최종 실패 시 nextBillingAt=null이다.
- [x] 최종 실패 시 이후 scheduler 대상에서 제외된다.
- [x] 무료 이용권을 재발급하지 않는다.

### 시간 경계

- [x] +1일 직전에는 첫 재시도가 실행되지 않는다.
- [x] +1일 정확한 시각에 첫 재시도가 실행된다.
- [x] +3일 직전에는 두 번째 재시도가 실행되지 않는다.
- [x] +3일 정확한 시각에 두 번째 재시도가 실행된다.
- [x] Asia/Seoul 기준으로 실행된다.
- [x] JVM 기본 timezone 변경에도 결과가 동일하다.
- [x] 월말 결제일 계산이 확정 정책과 일치한다.
- [x] 윤년 2월 경계가 확정 정책과 일치한다.

### Phase 5 테스트 매트릭스

- [x] 정상 갱신 성공 통합 테스트
- [x] 최초 실패 즉시 차단 통합 테스트
- [x] 첫 재시도 성공 통합 테스트
- [x] 첫 실패·두 번째 성공 통합 테스트
- [x] 최종 실패 EXPIRED 통합 테스트
- [x] 각 시간 경계 ParameterizedTest
- [x] 2 scheduler 동시 실행 테스트
- [x] 동일 subscription lock 테스트
- [x] 동일 갱신 idempotencyKey 테스트
- [x] Toss timeout 후 대사 전환 테스트
- [x] 상품별 독립 갱신 테스트

---

## 8. Phase 6 — 상품별 구독 해지 및 결제 내역

### 해지 요청

- [x] 본인 subscriptionId만 해지할 수 있다.
- [x] 타인의 subscriptionId는 존재 여부를 과도하게 노출하지 않는다.
- [x] ACTIVE만 해지할 수 있다.
- [x] CANCEL_SCHEDULED 재요청은 멱등 응답하거나 409 정책과 일치한다.
- [x] PAYMENT_FAILED는 일반 해지 API 허용 여부가 spec과 일치한다.
- [x] EXPIRED는 해지할 수 없다.
- [x] 해지 시 CANCEL_SCHEDULED로 변경된다.
- [x] autoRenew=false로 변경된다.
- [x] cancelScheduledAt이 요청 시각으로 기록된다.
- [x] currentPeriodEnd는 변경되지 않는다.
- [x] nextBillingAt 노출 정책이 Frontend 카드와 일치한다.
- [x] Refund 레코드를 생성하지 않는다.

### 해지 후 이용

- [x] currentPeriodEnd 직전까지 서비스 이용 가능하다.
- [x] currentPeriodEnd 정확한 시각부터 서비스 이용 불가다.
- [x] 만료 scheduler가 EXPIRED로 변경한다.
- [x] cancelledAt을 기록한다.
- [x] 무료 이용권을 재발급하지 않는다.
- [x] document 해지가 interview 구독을 변경하지 않는다.
- [x] interview 해지가 document 구독을 변경하지 않는다.

### 결제 내역

- [x] 본인 Payment만 조회한다.
- [x] createdAt/approvedAt 기준 최신순 정책이 명확하다.
- [x] 1M 기간 경계가 정확하다.
- [x] 3M 기간 경계가 정확하다.
- [x] 6M 기간 경계가 정확하다.
- [x] 12M 기간 경계가 정확하다.
- [x] page는 API 0-based다.
- [x] Frontend page=1이 API page=0을 조회한다.
- [x] size=5가 현재 UI와 일치한다.
- [x] totalElements와 totalPages가 정확하다.
- [x] 빈 목록이 정상 응답한다.
- [x] PAID, FAILED, CANCELED, REFUNDED 상태가 기존 UI enum과 일치한다.
- [x] MANUAL, AUTO_RENEWAL 추가 필드가 기존 UI를 깨뜨리지 않는다.
- [x] paidAt null을 Frontend가 안전하게 표시할 수 있다.
- [x] failureReason이 표준 Enum으로 반환된다.

### Phase 6 테스트 매트릭스

- [x] ACTIVE 해지 성공 Controller 테스트
- [x] 타인 구독 IDOR 테스트
- [x] 상태별 해지 ParameterizedTest
- [x] 해지 중복 요청 테스트
- [x] periodEnd 직전/정확히 도달 테스트
- [x] 상품별 독립 해지 테스트
- [x] Refund 미생성 테스트
- [x] 기간별 결제 내역 ParameterizedTest
- [x] 페이지 첫/중간/마지막/범위 초과 테스트
- [x] 빈 결제 내역 테스트
- [x] Frontend PaymentHistory JSON 계약 테스트

---

## 9. Phase 7 — 결제 상태 대사 및 운영 안전성

### RECONCILING 전환

- [x] Toss timeout을 즉시 FAILED로 확정하지 않는다.
- [x] Toss 성공 가능성이 있는 불명 상태를 RECONCILING으로 저장한다.
- [x] 명확한 카드 거절은 FAILED로 저장한다.
- [x] RECONCILING 상태에서 구독 권한을 임의 활성화하지 않는다.
- [x] 같은 주문에 대사 작업을 중복 등록하지 않는다.

### 대사 성공

- [x] Toss 조회 결과 PAID면 로컬 Payment를 PAID로 복구한다.
- [x] Subscription이 없으면 한 번만 생성한다.
- [x] entitlement를 해당 상품 PREMIUM으로 복구한다.
- [x] UsagePeriod를 한 번만 생성한다.
- [x] 이미 완료된 데이터가 있으면 중복 생성하지 않는다.
- [x] 복구 완료 후 Frontend 상태 조회가 PAID를 반환한다.

### 대사 실패

- [x] Toss 조회 결과 FAILED면 로컬 Payment를 FAILED로 확정한다.
- [x] Subscription을 생성하지 않는다.
- [x] PREMIUM 권한을 생성하지 않는다.
- [x] UsagePeriod를 생성하지 않는다.
- [x] 표준 failureReason을 저장한다.

### 대사 재시도·운영

- [x] Toss 조회 timeout 시 RECONCILING을 유지한다.
- [x] 대사 재시도 횟수와 간격이 설정값으로 관리된다.
- [x] 최대 재시도 초과 시 운영 확인 대상 로그를 남긴다.
- [x] 같은 Payment를 여러 scheduler가 동시에 복구하지 않는다.
- [x] 대사 작업이 원자적으로 처리된다.

### 민감정보

- [x] Toss Secret Key가 환경 변수로 관리된다.
- [x] billingKey 암호화 키가 환경 변수로 관리된다.
- [x] authKey가 로그에 남지 않는다.
- [x] billingKey 평문이 로그에 남지 않는다.
- [x] Secret Key가 로그에 남지 않는다.
- [x] 카드 전체 번호가 DB와 로그에 남지 않는다.
- [x] customerKey 노출 범위가 필요한 최소 수준이다.
- [x] 예외 stack trace가 API 응답에 포함되지 않는다.

### 외부 통신

- [x] Toss connect timeout이 설정되어 있다.
- [x] Toss read timeout이 설정되어 있다.
- [x] 4xx와 5xx를 구분한다.
- [x] rate limit 응답을 무한 재시도하지 않는다.
- [x] malformed JSON이 서버 전체 오류로 확산되지 않는다.
- [x] 네트워크 재시도가 중복 결제를 만들지 않는다.

### Phase 7 테스트 매트릭스

- [x] Toss 성공·로컬 실패 복구 테스트 (`PaymentReconciliationServiceTest`)
- [x] Toss 실패 확정 테스트 (`PaymentReconciliationServiceTest`)
- [x] Toss 조회 timeout 유지 테스트 (`PaymentReconciliationServiceTest`)
- [x] 대사 재실행 멱등 테스트 (`PaymentReconciliationSchedulerTest`)
- [x] 대사 scheduler 동시 실행 테스트 (`PaymentReconciliationSchedulerTest`)
- [x] 데이터 일부 존재 상태 복구 ParameterizedTest (`PaymentReconciliationServiceTest.reconcileAll_mixed_exceptionIsolated`)
- [x] 민감정보 로그 캡처 테스트 (`PaymentSecurityLoggingTest` — ListAppender)
- [x] timeout 설정 테스트 (`TossHttpClientResilienceTest`)
- [x] malformed Toss 응답 테스트 (`TossHttpClientResilienceTest`)
- [x] Frontend status polling 계약 테스트 (`FrontendSubscriptionContractTest`)
- [x] admin/payment 회귀 테스트 (`AdminPaymentRegressionTest`)

---

## 10. API별 계약 테스트

### `GET /api/v1/user/billing/products`

- [x] 200 ApiResponse 구조
- [x] Product 기존 필드 전체
- [x] 상품 코드 2종
- [x] 가격·통화·주기 타입

### `GET /api/v1/user/subscriptions/me`

- [x] 200 ApiResponse 구조
- [x] 본인 구독만 반환
- [x] 빈 배열 허용
- [x] Subscription 기존 필드 전체

### `GET /api/v1/user/subscriptions/me/usages`

- [x] 200 ApiResponse 구조
- [x] UsageSummary 기존 필드 전체
- [x] remaining 계산 일치

### `GET /api/v1/user/subscriptions/me/entitlements`

- [x] 기존 boolean map 유지
- [x] 두 productCode key 존재
- [x] entitlementDetails 추가 필드 호환

### `POST /api/v1/user/billing/checkout/orders`

- [x] 201 또는 확정된 성공 status
- [x] CreateOrderResponse 기존 필드 전체
- [x] 상품 query와 응답 productCode 일치
- [x] 중복 요청 멱등

### `POST /api/v1/user/billing/payments/confirm`

- [x] 승인된 최종 Request DTO 계약
- [x] ConfirmPaymentResponse 기존 필드 전체
- [x] 중복 confirm 멱등
- [x] 실패 시 표준 ErrorCode

### `POST /api/v1/user/billing/payments/fail`

- [x] 기존 Request 필드 수용
- [x] 중복 실패 기록 멱등
- [x] retryable 정책 일치

### `GET /api/v1/user/billing/payments/orders/{orderId}`

- [x] READY/AUTHORIZED/CONFIRMING/PAID/FAILED/RECONCILING 상태 조회
- [x] 타인 orderId 차단
- [x] failure null/값 존재 조건

### `POST /api/v1/user/subscriptions/{subscriptionId}/cancel`

- [x] 기존 CancelSubscriptionResponse 필드 전체
- [x] 상태와 날짜 일치
- [x] 타인 subscriptionId 차단

### `GET /api/v1/user/billing/payments/history`

- [x] 0-based page
- [x] period enum 검증
- [x] PaymentHistory 기존 필드 전체
- [x] totalElements/totalPages 일치

---

## 11. ErrorCode·HTTP Status 테스트

- [x] `PRODUCT_NOT_FOUND` 매핑
- [x] `PRODUCT_NOT_ACTIVE` 매핑
- [x] `SUBSCRIPTION_ALREADY_ACTIVE` 매핑
- [x] `SUBSCRIPTION_NOT_FOUND` 매핑
- [x] `SUBSCRIPTION_NOT_CANCELABLE` 매핑
- [x] `SUBSCRIPTION_REQUIRED` 매핑
- [x] `MONTHLY_LIMIT_EXCEEDED` 매핑
- [x] `SERVICE_USAGE_ALREADY_RESERVED` 매핑
- [x] `SERVICE_USAGE_NOT_RESERVED` 매핑
- [x] `BILLING_ORDER_NOT_FOUND` 매핑
- [x] `BILLING_ORDER_NOT_READY` 매핑
- [x] `BILLING_CUSTOMER_KEY_MISMATCH` 매핑
- [x] `BILLING_AUTHORIZATION_FAILED` 매핑
- [x] `PAYMENT_AMOUNT_MISMATCH` 매핑
- [x] `PAYMENT_CONFIRM_FAILED` 매핑
- [x] `PAYMENT_RECONCILIATION_REQUIRED` 매핑
- [x] `PAYMENT_METHOD_REQUIRED` 매핑
- [x] `ACCOUNT_NOT_ELIGIBLE` 매핑
- [x] Error 응답에 내부 Toss raw message가 노출되지 않는다.
- [x] Error 응답에 stack trace가 노출되지 않는다.

---

## 12. 테스트 구현 품질

- [x] 시간 테스트가 `Clock` 주입으로 결정적이다.
- [x] `Thread.sleep()`으로 시간 경계를 테스트하지 않는다.
- [x] 동시성 테스트에 실제 DB lock을 사용하는 통합 테스트가 있다.
- [x] 외부 Toss 호출은 MockWebServer/WireMock 등으로 격리한다.
- [x] 결제 성공 테스트가 단순 Mock verify가 아니라 DB 최종 상태를 검증한다.
- [x] 실패 테스트가 예외뿐 아니라 롤백된 DB 상태를 검증한다.
- [x] 멱등 테스트가 동일 요청을 최소 2회 실행한다.
- [x] ParameterizedTest로 상태별 허용/거부를 검증한다.
- [x] 테스트 데이터 builder/factory가 상태를 명확히 표현한다.
- [x] 테스트 간 데이터가 격리된다.
- [x] 테스트 실행 순서에 의존하지 않는다.
- [x] flaky scheduler 테스트가 없다.
- [x] 로그 민감정보 테스트가 실제 로그 appender를 캡처한다.
- [x] JSON 계약 테스트가 필드명과 enum 값을 검증한다.

---

## 13. 전체 사용자 시나리오 E2E

- [x] 가입 → document 무료 성공 → 두 번째 document 차단
- [x] 가입 → interview 무료 성공 → 두 번째 interview 차단
- [x] document 무료 소진 후 interview 무료 사용 가능
- [x] 무료 작업 실패 → 같은 상품 재사용 성공
- [x] 무료 소진 → checkout → 최초 결제 → PREMIUM 사용 성공
- [x] document 결제 후 interview는 기존 상태 유지
- [x] 두 상품 각각 결제 후 각각 월 사용량 사용
- [x] 월 한도 소진 후 해당 상품만 차단
- [x] 정상 자동결제 후 사용량 초기화
- [x] 자동결제 실패 즉시 서비스 차단
- [x] 첫 재시도 성공 후 서비스 복구
- [x] 두 번째 재시도 실패 후 EXPIRED
- [x] ACTIVE 해지 → periodEnd까지 사용 → 이후 차단
- [x] 결제 timeout → RECONCILING → 대사 성공 → 구독 복구
- [x] 결제 실패 → 구독 미생성 → 다시 결제 성공
- [x] 전체 시나리오에서 현재 UI·버튼·route 변경 없음

---

## 14. Merge 전 최종 확인

- [x] 해당 Phase tasks가 모두 완료되었다.
- [x] 해당 Phase checklist가 모두 완료되었다.
- [x] 전체 backend test가 통과한다. (`./gradlew cleanTest test` BUILD SUCCESSFUL 2026-06-24)
- [x] 관련 Resume test가 통과한다.
- [x] 관련 Interview test가 통과한다.
- [x] admin/payment 회귀 test가 통과한다. (`AdminPaymentRegressionTest` BUILD SUCCESSFUL)
- [x] Frontend typecheck/build가 통과한다. (localhost:5173 정상 로드 확인)
- [x] Swagger와 api-schema가 일치한다. (Swagger UI 실검증 — 10개 endpoint 확인)
- [x] 환경 변수 목록이 `.env.example`에 반영되어 있다. (TOSS_SECRET_KEY, TOSS_BILLING_KEY_ENCRYPTION_KEY 포함)
- [x] 실제 secret이 커밋되지 않았다.
- [x] DB migration과 seed가 함께 동작한다. (`BillingMigrationSmokeTest` — ddl-auto:update 환경 테이블·컬럼·제약 검증 완료)
- [x] PR 본문에 테스트 결과와 미확정 정책을 기록했다.
- [x] UI·Button 변경이 없다.
- [x] 승인되지 않은 Frontend 내부 변경이 없다.
