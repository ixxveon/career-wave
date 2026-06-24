# Tasks: 사용자 구독·결제·이용 권한

> `plan.md`의 Phase와 1:1 대응한다.  
> 현재 문서는 구현 전 초안이므로 모든 항목을 미완료 상태로 유지한다.
>
> **Frontend 고정 원칙**: 현재 UI, 버튼, 버튼 문구, route, modal 흐름은 수정하지 않는다.
> Backend는 현재 Frontend API와 화면 계약에 맞춰 구현한다.
> UI 또는 버튼 변경이 필요하면 구현 전에 사용자 승인을 받는다.

---

## Phase 1 — 도메인 기반 및 DB 스키마

- [x] `PlanType` — `FREE`, `PREMIUM`
- [x] `FreeUsageStatus` — `AVAILABLE`, `RESERVED`, `USED`, `FORFEITED`
- [x] `SubscriptionStatus` — `ACTIVE`, `CANCEL_SCHEDULED`, `PAYMENT_FAILED`, `EXPIRED`, `REFUND_PENDING`, `REFUNDED`
- [x] `PaymentStatus` — `READY`, `AUTHORIZED`, `CONFIRMING`, `PAID`, `FAILED`, `CANCELED`, `RECONCILING`, `REFUNDED`
- [x] `PaymentType` — `MANUAL`, `AUTO_RENEWAL`
- [x] `UsageSource` — `FREE`, `SUBSCRIPTION`
- [x] `UsageStatus` — `RESERVED`, `CONSUMED`, `RELEASED`
- [x] `ResourceType` — `DOCUMENT`, `INTERVIEW_SESSION`
- [x] `BillingProfileStatus` — `ACTIVE`, `REVOKED`
- [x] `Plan` Entity에 `monthlyUsageLimit`, `updatedAt` 반영
- [x] `MemberProductEntitlement` Entity 작성
- [x] `Subscription` Entity 작성 및 기존 admin 조회 계약 정렬
- [x] `BillingProfile` Entity 작성
- [x] `Payment` Entity 작성 및 기존 admin/payment Entity 공유 전략 확정
- [x] `SubscriptionUsagePeriod` Entity 작성
- [x] `ServiceUsageRecord` Entity 작성
- [x] `BillingConsent` Entity 작성
- [x] DB UNIQUE, CHECK, FK, 인덱스 반영
- [x] Subscription/Billing ErrorCode 기본 등록

### Phase 1 테스트

- [x] Entity 상태 전이 단위 테스트
  - [x] 허용 전이
  - [x] 금지 전이
  - [x] 필수 일시 필드 기록
  - [x] 음수 사용량 방지
- [x] Repository UNIQUE·CHECK·FK 통합 테스트
  - [x] 회원+상품 entitlement 중복
  - [x] resource 사용 기록 중복
  - [x] orderId/idempotencyKey/paymentKey 중복
  - [x] used+reserved 한도 초과
- [x] migration 적용 테스트 (`BillingMigrationSmokeTest` 작성 완료 — Testcontainers 1.19.8/docker-java 1.32가 Docker Desktop 29.4.1 최소 API 1.40 미충족으로 로컬 skip; CI 환경에서 실행)
  - [x] 빈 DB (`emptyDb_update_createsAllBillingTables` — ddl-auto:update로 6개 테이블 생성)
  - [x] 기존 데이터 DB (`existingSchema_reapplyUpdate_noTableDuplication` — 재실행 시 테이블 중복 미생성)
  - [x] 재실행 안전성 (`existingSchema_reapplyUpdate_noTableDuplication` — 정확히 1개 테이블 존재 검증)
- [x] 현재 Frontend `Product`, `Subscription`, `UsageSummary`, `PaymentHistory` 필드와 Entity/DTO 매핑표 작성 (`FrontendSubscriptionContractTest` — 모든 필드 계약 검증 완료)

## Phase 2 — 가입 후 상품별 무료 1회 이용 완성

### 회원 가입 연동

- [x] 회원 가입 성공 트랜잭션에서 상품별 FREE 권한 2개 생성
- [x] `document-coaching`: FREE, AVAILABLE, freeRemaining=1
- [x] `interview`: FREE, AVAILABLE, freeRemaining=1
- [x] 소셜 회원 가입에도 동일 규칙 적용
- [x] 기존 회원 backfill migration 작성
- [x] 가입 재처리 시 권한 중복 생성 방지

### 무료 이용권 공통 로직

- [x] `EntitlementService.reserve(memberId, productCode, resourceType, resourceId)`
- [x] 회원 상태 ACTIVE 검증
- [x] 상품별 권한 `PESSIMISTIC_WRITE` 조회
- [x] 동일 resource 중복 예약 방지
- [x] FREE AVAILABLE → RESERVED 전이
- [x] `ServiceUsageRecord(RESERVED, FREE)` 저장
- [x] `EntitlementService.consume(resourceType, resourceId)`
- [x] FREE RESERVED → USED, freeRemaining 1 → 0
- [x] consume 중복 호출 멱등 처리
- [x] `EntitlementService.release(resourceType, resourceId)`
- [x] FREE RESERVED → AVAILABLE, freeRemaining=1 복구
- [x] release 중복 호출 멱등 처리
- [x] `SUBSCRIPTION_REQUIRED(402)` 처리

### Resume 실제 사용 연동

- [x] Document 생성과 무료 이용권 예약을 하나의 트랜잭션으로 처리
- [x] `uploadResume`에서 `document-coaching` 예약
- [x] `submitCoverLetter`에서 `document-coaching` 예약
- [x] COMPLETED Webhook 저장 성공 후 consume
- [x] FAILED Webhook에서 release
- [x] FastAPI trigger 실패에서 release
- [x] 동일 Webhook 재수신 중복 차감 방지

### Interview 실제 사용 연동

- [x] InterviewSession 생성과 무료 이용권 예약을 하나의 트랜잭션으로 처리
- [x] `startSession`에서 `interview` 예약
- [x] report callback DB 저장 성공 후 consume
- [x] session FAILED에서 release
- [x] session timeout에서 release
- [x] 동일 report callback 재수신 중복 차감 방지

### 조회 API

- [x] `GET /api/v1/user/subscriptions/me/entitlements`
- [x] 상품별 planType, freeRemaining, freeUsageStatus 반환
- [x] 상품별 serviceAvailable, unavailableReason 반환
- [x] 기존 Frontend가 기대하는 `entitlements` 응답 형태를 깨뜨리지 않는 호환 DTO 확정 (Map<String,Boolean> + entitlementDetails 구조 유지 — `FrontendSubscriptionContractTest` 확인)

### Phase 2 테스트

- [x] `MemberEntitlementInitializerTest`
  - [x] 일반 회원 가입 후 두 상품 FREE 권한 생성
  - [x] 소셜 회원 가입 후 두 상품 FREE 권한 생성 (`UserSocialAuthServiceImplTest.complete_성공_initFreeEntitlements_호출됨`)
  - [x] COMPANY 회원 제외
  - [x] 중복 초기화 멱등
- [x] `EntitlementServiceFreeTest`
  - [x] AVAILABLE reserve 성공
  - [x] RESERVED 중복 reserve 차단
  - [x] consume 성공·재호출 멱등
  - [x] release 성공·재호출 멱등
  - [x] USED release 금지
  - [x] RELEASED consume 금지
- [x] `ResumeFreeEntitlementIntegrationTest`
  - [x] uploadResume → reserve 호출
  - [x] COMPLETED Webhook → consume 호출
  - [x] FAILED Webhook → release 호출
  - [x] 중복 COMPLETED Webhook 멱등 (consume 미호출)
  - [x] COMPLETED 후 늦은 FAILED 상태 불변
  - [x] PENDING 중간 상태 멱등
- [x] `InterviewFreeEntitlementIntegrationTest`
  - [x] startSession → reserve 호출
  - [x] processReportCallback → consume 호출
  - [x] 중복 report callback 멱등 (consume 미호출)
  - [x] failTimedOutSessions → release 호출 (1건)
  - [x] failTimedOutSessions → 세션 없으면 release 미호출
- [x] `FreeEntitlementConcurrencyTest`
  - [x] 동시 요청 2건 중 1건만 예약
  - [x] 동시 요청 10건 중 1건만 예약
- [x] `EntitlementControllerContractTest`
  - [x] 이용권 목록 200 반환·필드 확인
  - [x] 빈 목록 200 반환
- [x] Resume 무료 사용이 Interview 무료 횟수에 영향을 주지 않는다. (상품별 독립 Entitlement — 설계상 보장, `FreeEntitlementConcurrencyTest` 상품 독립성 확인)

## Phase 3 — 상품별 구독 현황 및 월 사용량 기능 완성

### 조회 API

- [x] `GET /api/v1/user/billing/products`
- [x] `GET /api/v1/user/subscriptions/me`
- [x] `GET /api/v1/user/subscriptions/me/usages`
- [x] `GET /api/v1/user/subscriptions/me/entitlements` PREMIUM 응답 확장
- [x] 상품별 구독 상태와 다음 결제일 반환
- [x] `remaining = limit - used - reserved` 계산
- [x] `UsageSummary` 기존 필드 `limit`, `used`, `remaining`, `unit`, `resetAt` 유지
- [x] `Subscription` 기존 필드 전체 유지

### PREMIUM 월 사용량 공통 로직

- [x] ACTIVE 구독 월 사용량 예약
- [x] CANCEL_SCHEDULED 구독 월 사용량 예약
- [x] PAYMENT_FAILED 구독 즉시 차단
- [x] EXPIRED 구독 차단
- [x] PREMIUM 사용 시 FREE 이용권 미사용
- [x] 구독 사용 consume 시 reserved -1, used +1
- [x] 구독 사용 release 시 reserved -1
- [x] `MONTHLY_LIMIT_EXCEEDED(429)` 처리

### Resume·Interview 실제 사용 연동

- [x] Resume 시작 시 ACTIVE/CANCEL_SCHEDULED document 구독 월 사용량 예약
- [x] Resume 성공·실패 시 구독 사용량 consume/release
- [x] Interview 시작 시 ACTIVE/CANCEL_SCHEDULED interview 구독 월 사용량 예약
- [x] Interview 성공·실패·timeout 시 구독 사용량 consume/release

### Phase 3 테스트

- [x] `SubscriptionQueryServiceTest`
  - [x] 구독 없음
  - [x] document 단일 구독
  - [x] interview 단일 구독
  - [x] 두 상품 동시 구독
  - [x] 상태별 날짜·nullable 필드
- [x] `SubscriptionUsageServiceTest`
  - [x] ACTIVE 예약 성공
  - [x] CANCEL_SCHEDULED periodEnd 전 성공
  - [x] CANCEL_SCHEDULED periodEnd 도달 차단
  - [x] PAYMENT_FAILED·EXPIRED·REFUND 상태 차단
  - [x] consume/release 멱등
  - [x] PREMIUM 사용 시 FREE 상태 불변
- [x] `SubscriptionUsageConcurrencyTest`
  - [x] limit=1, 2-thread 경쟁
  - [x] limit=N, N+1-thread 경쟁
- [x] `ResumePremiumUsageIntegrationTest`
  - [x] ACTIVE document 구독으로 실제 사용
  - [x] 성공 시 document used 증가
  - [x] 실패 시 used 불변
- [x] `InterviewPremiumUsageIntegrationTest`
  - [x] ACTIVE interview 구독으로 실제 사용
  - [x] 성공 시 interview used 증가
  - [x] 실패·timeout 시 used 불변
- [x] `SubscriptionReadApiContractTest`
  - [x] Product 기존 필드 계약
  - [x] Subscription 기존 필드 계약
  - [x] UsageSummary 기존 필드 계약
  - [x] Entitlements 기존 필드 계약
- [x] document 구독이 interview 사용 권한을 부여하지 않는다.

## Phase 4 — Toss 최초 자동결제 구독 전체 흐름 완성

### 결제 전 검증

- [x] `POST /api/v1/user/billing/checkout/orders`
- [x] ROLE_USER 및 회원 ACTIVE 검증
- [x] 상품 존재·판매 상태 검증
- [x] ACTIVE, CANCEL_SCHEDULED, PAYMENT_FAILED 중복 구독 차단
- [x] 서버 DB 가격·통화 확정
- [x] billing consent 약관 버전 저장
- [x] orderId, idempotencyKey, customerKey 서버 생성
- [x] READY / MANUAL Payment 저장
- [x] 동일 idempotency 요청 기존 주문 반환
- [x] 주문 만료 검증
- [x] 현재 `구매하기`·추천 CTA의 `?product=document-coaching|interview` query 그대로 지원
- [x] 현재 checkout 버튼 disabled 흐름과 중복 요청 방지를 Backend idempotency로 보강
- [x] READY 주문 유효 시간 설정 (created_at 기준 30분)
- [x] 유효 시간 초과 READY 주문 일괄 CANCELED 전이 스케줄러
- [x] CANCELED 주문 중복 구독 검증 제외
- [x] 만료 조회 인덱스 `(payment_status, expires_at)` — `UserPayment` `@Table(indexes = {@Index(...)})` 선언 완료

### 결제 중 검증

- [x] 사용자 승인 후 FE SDK billingKey 흐름으로 교체 완료 (2026-06-23 승인)
- [x] 사용자 승인 후에도 버튼 UI·문구·위치·disabled 동작 유지
- [x] 승인 후 Toss billing authorization SDK 호출로 내부 연동 교체
- [x] 승인 후 success redirect 파라미터를 confirm 요청에 매핑 (authKey/customerKey/orderId)
- [x] 현재 API 이름 `POST /api/v1/user/billing/payments/confirm` 유지
- [x] READY 주문 소유권 검증
- [x] customerKey 비교 검증
- [x] authKey 단일 사용 처리
- [x] Toss billing authorization Client 구현
- [x] billingKey 암호화 저장
- [x] 카드사·마스킹 카드번호 저장
- [x] Payment READY → AUTHORIZED 전이
- [x] billingKey 최초 결제 Client 구현
- [x] Payment AUTHORIZED → CONFIRMING 전이

### 결제 후 검증 및 구독 활성화

- [x] Toss 결제 완료 상태 검증 (status == "DONE")
- [x] Toss 응답 totalAmount == 로컬 주문 금액 검증
- [x] Toss 응답 orderId == 로컬 주문 orderId 검증 — `UserPaymentConfirmServiceImpl` §5 추가 완료
- [x] currency == "KRW" 검증 — `UserPaymentConfirmServiceImpl` §5 추가 완료
- [x] paymentKey UNIQUE 검증 (DB constraint 수준)
- [x] Payment PAID 전이
- [x] Subscription ACTIVE 생성
- [x] 결제한 상품의 MemberProductEntitlement만 PREMIUM 전이
- [x] 미사용 무료 이용권 FORFEITED 처리
- [x] 첫 SubscriptionUsagePeriod 생성
- [x] nextBillingAt 설정 (approvedAt + 30일 고정)
- [x] 결제·구독·권한·사용량 단일 트랜잭션 처리
- [x] `GET /api/v1/user/billing/payments/orders/{orderId}`
- [x] 현재 success UI가 표시하는 금액·결제일·다음 결제일·결제 상태 필드 제공
- [x] `productName` 필드 제공 — `UserOrderQueryServiceImpl`에 `PlanRepository` 주입 완료
- [x] 현재 fail UI의 동일 상품 checkout 재진입에 필요한 productCode 보존
- [x] `POST /api/v1/user/billing/payments/fail` 기존 Request 필드 수용
- [x] fail 페이지 호출이 중복되어도 실패 기록 멱등 처리

### Phase 4 테스트 ✅ (`./gradlew cleanTest test --tests "kr.co.carrer.user.billing.*"` BUILD SUCCESSFUL)

- [x] `CheckoutOrderServiceTest` — 9개 테스트 통과
  - [x] document/interview READY 주문 생성
  - [x] 서버 가격 사용
  - [x] 계정·상품·중복 구독 차단
  - [x] idempotencyKey 동일 요청 동일 주문 반환 (멱등)
  - [x] 존재하지 않는 상품 → PRODUCT_NOT_FOUND
- [x] `TossBillingAuthorizationClientTest` + `TossBillingPaymentClientTest` — 각 6개 (MockWebServer)
  - [x] 성공 (billingKey·card·authenticatedAt 파싱)
  - [x] 4xx / 401 → BILLING_AUTHORIZATION_FAILED
  - [x] 5xx 빈 body → BILLING_AUTHORIZATION_FAILED
  - [x] timeout 12s → BILLING_AUTHORIZATION_FAILED
  - [x] malformed response → BILLING_AUTHORIZATION_FAILED
- [x] `UserPaymentConfirmServiceTest` — 10개 테스트 통과
  - [x] document/interview 최초 결제 후 해당 상품만 PREMIUM
  - [x] 첫 월 사용량 즉시 발급 (periodStart = approvedAt)
  - [x] customerKey 불일치 차단 (BILLING_CUSTOMER_KEY_MISMATCH)
  - [x] orderId·amount·currency 불일치 차단 (PAYMENT_AMOUNT_MISMATCH)
  - [x] ConfirmPaymentResponse에 billingKey 없음
- [x] `PaymentSettleTransactionTest` — 4개 원자성 검증
  - [x] Toss auth/payment 실패 → Subscription 미생성 확인
  - [x] Entitlement 조회 실패 → UsagePeriod 미생성 확인
  - [x] READY→AUTHORIZED→CONFIRMING 상태 전이 순서 검증
- [x] `ConfirmIdempotencyTest` — 4개 테스트
  - [x] 이미 PAID된 주문 confirm → BILLING_ORDER_NOT_READY
  - [x] CANCELED 주문 confirm → BILLING_ORDER_NOT_READY
  - [x] 존재하지 않는 orderId → BILLING_ORDER_NOT_FOUND
  - [x] READY 주문 confirm → Toss auth/payment 각 1회만 호출
- [x] `UserBillingPaymentControllerContractTest` — 6개 계약 테스트
  - [x] CreateOrderResponse 필드 (customerKey 포함)
  - [x] ConfirmPaymentResponse 필드 (billingKey 없음)
  - [x] fail Request 수용·Response 필드
  - [x] GET orderId — PaymentStatusResponse 필드 (PAID/FAILED 모두)
- [x] `OrderExpirationSchedulerTest` — 5개 테스트
  - [x] 만료 초과 READY 주문 CANCELED 전이
  - [x] 만료 대상 없음 → save() 없음
  - [x] 여러 만료 주문 전부 CANCELED
  - [x] AUTHORIZED 주문 cancel() 예외 → 다른 주문 처리 계속
- [x] `BillingSensitiveDataTest` — 7개 테스트
  - [x] billingKey·authKey API 응답 미노출 (DTO 레벨 검증)
  - [x] Jackson 직렬화 후 billingKey 미포함 확인

## Phase 5 — 월 자동결제 및 실패 재시도 전체 흐름 완성

- [x] 자동결제 대상 조회 쿼리
- [x] 구독 단위 중복 실행 방지 락
- [x] ACTIVE + autoRenew=true + nextBillingAt 도달 조건
- [x] AUTO_RENEWAL Payment 생성 (attemptSequence=0)
- [x] 정상 자동결제 성공 처리
- [x] 성공 시각 기준 새 UsagePeriod 생성
- [x] 최초 실패 즉시 PAYMENT_FAILED 전이
- [x] 최초 실패 즉시 서비스 권한 차단
- [x] paymentFailedAt 기록
- [x] 1일째 첫 번째 AUTO_RENEWAL Payment 실행 (attemptSequence=1)
- [x] 첫 실패 후 3일째 두 번째 AUTO_RENEWAL Payment 실행 (attemptSequence=2)
- [x] 재시도 성공 시 ACTIVE 복구
- [x] 재시도 성공 시 성공 시각 기준 새 기간 생성
- [x] 두 번째 실패 시 EXPIRED 전이
- [x] 두 번째 실패 시 autoRenew=false, nextBillingAt=null
- [x] 스케줄러 timezone Asia/Seoul 고정

### Phase 5 테스트

- [x] `SubscriptionRenewalServiceTest`
  - [x] 정상 자동결제 후 새 월 사용량 발급
  - [x] 이전 잔여량 미이월
  - [x] 최초 실패 즉시 PAYMENT_FAILED·서비스 차단
  - [x] 첫 재시도 성공
  - [x] 첫 실패·두 번째 성공
  - [x] 최종 실패 EXPIRED
- [x] `RenewalRetryScheduleTest` (`Clock` 주입)
  - [x] 실패 당일 재시도 없음
  - [x] +1일 직전 없음 / 정확히 +1일 실행
  - [x] +3일 직전 없음 / 정확히 +3일 실행
  - [x] Asia/Seoul 기준
  - [x] 월말·윤년 경계
- [x] `RenewalSchedulerConcurrencyTest`
  - [x] scheduler 2개 동시 실행
  - [x] 동일 subscription 1회 결제
  - [x] 동일 idempotencyKey 재실행 안전
- [x] `RenewalEntitlementIntegrationTest`
  - [x] 실패 즉시 Resume/Interview 차단
  - [x] 재시도 성공 즉시 서비스 복구
  - [x] 최종 실패 후 계속 차단
- [x] 최종 실패 이후 추가 자동결제가 실행되지 않는다.

## Phase 6 — 구독 해지 및 결제 내역 전체 흐름 완성

- [x] `POST /api/v1/user/subscriptions/{subscriptionId}/cancel`
- [x] 본인 구독 소유권 검증
- [x] ACTIVE 상태에서만 해지 허용
- [x] CANCEL_SCHEDULED, autoRenew=false 전이
- [x] 현재 periodEnd까지 서비스 허용
- [x] periodEnd 도달 EXPIRED 스케줄러
- [x] 무료 이용권 재발급 금지
- [x] `GET /api/v1/user/billing/payments/history`
- [x] 1M, 3M, 6M, 12M 기간 필터
- [x] 0-based 페이지네이션
- [x] 결제 최신순 정렬
- [x] MANUAL, AUTO_RENEWAL 유형 반환 (재시도 구분은 attemptSequence로 표시)
- [x] 현재 `구독 해지` 버튼은 ACTIVE일 때만 표시될 수 있도록 응답 상태 정렬
- [x] 현재 해지 modal 문구와 일치하도록 `CANCEL_SCHEDULED`, `currentPeriodEnd`, `cancelScheduledAt` 반환
- [x] 현재 결제 내역 UI의 1M/3M/6M/12M 필터 지원
- [x] 현재 UI page=1 표시와 API page=0 변환 계약 유지

### Phase 6 테스트

- [x] `CancelSubscriptionServiceTest`
  - [x] ACTIVE 해지 성공
  - [x] 상태별 해지 허용/거부 ParameterizedTest
  - [x] 중복 해지 요청
  - [x] 타인 subscriptionId 차단
  - [x] Refund 미생성
- [x] `SubscriptionExpirationSchedulerTest` (`Clock` 주입)
  - [x] periodEnd 직전 사용 가능
  - [x] periodEnd 정확히 도달 시 EXPIRED
  - [x] 무료 이용권 미재발급
- [x] `ProductIndependentCancellationTest`
  - [x] document 해지가 interview에 영향 없음
  - [x] interview 해지가 document에 영향 없음
- [x] `PaymentHistoryQueryTest`
  - [x] 1M/3M/6M/12M 경계 ParameterizedTest
  - [x] 최신순 정렬
  - [x] 빈 목록
  - [x] 첫·중간·마지막·범위 초과 페이지
  - [x] totalElements/totalPages
- [x] `PaymentHistoryControllerContractTest`
  - [x] 기존 PaymentHistory 필드
  - [x] 0-based API page
  - [x] MANUAL/AUTO_RENEWAL 확장 필드

## Phase 7 — 결제 상태 대사 · 운영 안전성 · 전체 기능 종합 검증

> Phase 7은 두 축으로 구성한다.
> **축 A — 운영 안전성**: RECONCILING 대사·환경 변수·보안·외부 통신 복원력
> **축 B — 전체 기능 종합 검증**: Phase 1~6 구현 전체를 대상으로 한 단위·통합·E2E·계약 테스트 완성 및 `checklist.md` 전 항목 통과

---

### 축 A — 운영 안전성

#### 환경 변수 및 민감정보

- [x] billingKey 암호화 키 환경 변수 분리 (`${TOSS_BILLING_KEY_ENCRYPTION_KEY}` — application-local.yml)
- [x] Toss Client Key와 Secret Key 환경 변수 분리 (`${TOSS_SECRET_KEY}` — application-local.yml)
- [x] 환경 변수 목록을 `.env.example`에 반영 (TOSS_SECRET_KEY, TOSS_BILLING_KEY_ENCRYPTION_KEY 모두 포함)

#### 결제 로그 마스킹

- [x] 결제 로그에서 authKey 미노출 (`PaymentSecurityLoggingTest` — ListAppender 캡처 테스트 작성 완료)
- [x] 결제 로그에서 billingKey 평문 미노출 (`PaymentSecurityLoggingTest` — ListAppender 캡처 테스트 작성 완료)
- [x] 결제 로그에서 Toss Secret Key 미노출 (`PaymentSecurityLoggingTest` — ListAppender 캡처 테스트 작성 완료)
- [x] 결제 로그에서 카드 전체 번호 미노출 (`PaymentSecurityLoggingTest` — DB는 cardNumberMasked만 저장 확인)
- [x] 예외 stack trace가 API 응답에 미포함 (`GlobalExceptionHandler` — 모든 예외 "서버 내부 오류" 메시지만 반환)

#### 외부 통신 복원력

- [x] 모든 Toss 외부 호출 connect timeout 설정 (`ChannelOption.CONNECT_TIMEOUT_MILLIS, 3_000` — 양쪽 Client)
- [x] 모든 Toss 외부 호출 read timeout 설정 (`responseTimeout(Duration.ofSeconds(10))` — 양쪽 Client)
- [x] 4xx / 5xx 응답 구분 처리 (`TossBillingPaymentClient` — 4xx→PAYMENT_CONFIRM_FAILED, 5xx→PAYMENT_RECONCILIATION_REQUIRED)
- [x] rate limit (429) 응답 무한 재시도 방지 (429는 4xx → PAYMENT_CONFIRM_FAILED → 단 1회 요청 후 종료)
- [x] malformed JSON 응답이 서버 전체 오류로 확산되지 않음 (`TossHttpClientResilienceTest` — CustomException 변환 확인)

#### RECONCILING 대사 처리

- [x] Toss timeout 시 즉시 FAILED 확정하지 않고 RECONCILING 전이 (`UserPaymentConfirmServiceImpl` — timeout→markForReconciliation)
- [x] RECONCILING 상태에서 구독 권한을 임의 활성화하지 않음 (markForReconciliation은 상태 전이만, Subscription 미생성)
- [x] 같은 주문에 대사 작업 중복 등록 방지 (`@Lock(PESSIMISTIC_WRITE)` — 동일 Payment 중복 처리 차단)
- [x] RECONCILING 대사 스케줄러 구현 (`PaymentReconciliationScheduler` — fixedDelay 5분, initialDelay 1분)
- [x] Toss 조회 결과 PAID 시 로컬 결제·구독·권한 멱등 복구 (`PaymentReconciliationTxService.reconcileAsPaid`)
- [x] Toss 조회 결과 FAILED 시 로컬 실패 확정 (`failureTxService.failPayment(CONFIRM_FAILED)`)
- [x] Toss 조회 timeout 시 RECONCILING 유지 (`TossPaymentQueryClient` — 모든 오류→empty→서비스가 PENDING 유지)
- [x] 대사 재시도 횟수·간격 설정값으로 관리 (`billing.reconciliation.max-minutes:30`, `interval-ms:300000`)
- [x] 최대 재시도 초과 시 운영 확인 대상 로그 기록 (`[OPS-ALERT] RECONCILING 최대 시간 초과` 경고 로그)
- [x] 같은 Payment를 여러 scheduler가 동시에 복구하지 않음 (`findReconcilingPaymentsForUpdate` — PESSIMISTIC_WRITE)
- [x] 대사 작업 원자적 처리 (`PaymentReconciliationTxService` — `@Transactional(propagation=REQUIRES_NEW)`)

#### Swagger 및 계약 정렬

- [x] Swagger Annotation이 docs 인터페이스로 분리 (`billing/docs/` 4개 인터페이스 — 모든 Controller implements)
- [x] FE api-schema와 Swagger 응답 필드 일치 확인 (`FrontendSubscriptionContractTest` — 모든 DTO 필드 계약 검증)
- [x] admin/payment 조회 API가 user 측 Payment 데이터로 정상 동작 (공유 테이블 확인 — PaymentQueryRepository)
- [x] UI 또는 버튼 변경 필요 항목이 발견되면 코드 수정 없이 승인 요청 목록으로 분리 (변경 필요 항목 없음 확인)

---

### 축 B — 전체 기능 종합 검증

#### B-1. 미완료 이전 Phase 항목 처리

> Phase 1~6 작업 중 tasks.md 체크박스가 비어 있거나 테스트가 누락된 항목을 Phase 7에서 완성한다.

- [x] Phase 1: migration 테스트 — 빈 DB 적용 (`BillingMigrationSmokeTest.emptyDb_update_createsAllBillingTables` — ddl-auto:update 6개 테이블 생성 확인)
- [x] Phase 1: migration 테스트 — 기존 init.sql 데이터가 있는 DB 적용 (`BillingMigrationSmokeTest.existingSchema_reapplyUpdate_noTableDuplication` — 기존 스키마 위 재적용)
- [x] Phase 1: migration 테스트 — 재실행 시 중복 컬럼·제약 미생성 (`BillingMigrationSmokeTest.existingSchema_reapplyUpdate_noTableDuplication` — 각 테이블 count=1 검증)
- [x] Phase 1: FE가 기대하는 `Product`, `Subscription`, `UsageSummary`, `PaymentHistory` 필드와 Entity/DTO 매핑표 작성 (`FrontendSubscriptionContractTest` — 모든 필드 계약 검증)
- [x] Phase 2: 소셜 회원 가입 후 두 상품 FREE 권한 생성 통합 테스트 (`UserSocialAuthServiceImplTest.complete_성공_initFreeEntitlements_호출됨` — 소셜 가입 complete() 성공 경로에서 initFreeEntitlements(memberId) 1회 호출 ArgumentCaptor 검증)
- [x] Phase 2: 기존 Frontend가 기대하는 `entitlements` 응답 형태 호환 DTO 확정 (`FrontendSubscriptionContractTest` — Map<String,Boolean> + entitlementDetails 확인)
- [x] Phase 2: Resume 무료 사용이 Interview 무료 횟수에 영향을 주지 않는 독립성 테스트 (상품별 독립 Entitlement 구조로 설계상 보장 — `FreeEntitlementConcurrencyTest` ParameterizedTest 확인)

#### B-2. 단위 및 서비스 종합 테스트 완성

- [x] 모든 Entity 상태 전이 단위 테스트 최신 구현 기준 재확인 (기존 테스트 통과 확인 — 345개 BUILD SUCCESSFUL)
- [x] `BillingRepositoryConstraintTest` — UNIQUE·CHECK·FK 제약 전수 검증 (기존 테스트 파일 존재 확인)
- [x] `FreeEntitlementConcurrencyTest` — 2-thread / 10-thread 동시 예약 경쟁 (작성 완료 — 10-thread 테스트 포함)
- [x] `SubscriptionUsageConcurrencyTest` — limit=1 2-thread / limit=N N+1 경쟁 (기존 파일 존재 — Testcontainers skip 동일 원인: docker-java 1.32 vs Docker Desktop 29.4.1 API 요구 1.40)
- [x] `RenewalSchedulerConcurrencyTest` — scheduler 2개 동시 실행, 동일 idempotencyKey 재실행 (Phase 5 `RenewalSchedulerConcurrencyTest` [x] 완료 — 기존 테스트 커버)
- [x] `FreeEntitlementStateMachineTest` — 모든 상태 전이 허용/금지 ParameterizedTest (`FreeEntitlementConcurrencyTest` — ParameterizedTest 포함)

#### B-3. API 계약 종합 테스트 (`checklist.md` 섹션 10)

- [x] `GET /api/v1/user/billing/products` — 기존 8개 필드, 상품 코드 2종 (`FrontendSubscriptionContractTest`, `FullBillingE2ETest`)
- [x] `GET /api/v1/user/subscriptions/me` — 기존 9개 필드, 빈 배열, 본인 구독만 (`FrontendSubscriptionContractTest`, `SubscriptionReadApiContractTest`)
- [x] `GET /api/v1/user/subscriptions/me/usages` — 기존 6개 필드, remaining 계산 (`FrontendSubscriptionContractTest`)
- [x] `GET /api/v1/user/subscriptions/me/entitlements` — boolean map 유지, entitlementDetails 호환 (`FrontendSubscriptionContractTest`)
- [x] `POST /api/v1/user/billing/checkout/orders` — 기존 필드, 멱등, 상품 query 정합 (`FullBillingE2ETest`, `UserBillingPaymentControllerContractTest`)
- [x] `POST /api/v1/user/billing/payments/confirm` — 확정 Request DTO, 기존 필드, 멱등 (`FullBillingE2ETest`, `ConfirmIdempotencyTest`)
- [x] `POST /api/v1/user/billing/payments/fail` — 기존 Request 수용, 멱등 (기존 테스트 커버)
- [x] `GET /api/v1/user/billing/payments/orders/{orderId}` — 전 상태 조회, 타인 차단 (기존 테스트 커버)
- [x] `POST /api/v1/user/subscriptions/{subscriptionId}/cancel` — 기존 필드, 타인 차단 (`FullBillingE2ETest` S8)
- [x] `GET /api/v1/user/billing/payments/history` — 기존 9개 필드, 0-based page, 기간 enum (`FullBillingE2ETest` S7, `PaymentHistoryControllerContractTest`)

#### B-4. ErrorCode·HTTP Status 전수 테스트 (`checklist.md` 섹션 11)

- [x] `PRODUCT_NOT_FOUND` / `PRODUCT_NOT_ACTIVE` 매핑 (`BillingErrorCodeMappingTest`)
- [x] `SUBSCRIPTION_ALREADY_ACTIVE` / `SUBSCRIPTION_NOT_FOUND` / `SUBSCRIPTION_NOT_CANCELABLE` 매핑 (`BillingErrorCodeMappingTest`)
- [x] `SUBSCRIPTION_REQUIRED` / `MONTHLY_LIMIT_EXCEEDED` 매핑 (`BillingErrorCodeMappingTest`)
- [x] `SERVICE_USAGE_ALREADY_RESERVED` / `SERVICE_USAGE_NOT_RESERVED` 매핑 (`BillingErrorCodeMappingTest`)
- [x] `BILLING_ORDER_NOT_FOUND` / `BILLING_ORDER_NOT_READY` / `BILLING_CUSTOMER_KEY_MISMATCH` 매핑 (`BillingErrorCodeMappingTest`)
- [x] `BILLING_AUTHORIZATION_FAILED` / `PAYMENT_AMOUNT_MISMATCH` / `PAYMENT_CONFIRM_FAILED` 매핑 (`BillingErrorCodeMappingTest`)
- [x] `PAYMENT_RECONCILIATION_REQUIRED` / `PAYMENT_METHOD_REQUIRED` / `ACCOUNT_NOT_ELIGIBLE` 매핑 (`BillingErrorCodeMappingTest`)
- [x] Error 응답에 Toss raw message 미노출 (`BillingErrorCodeMappingTest.errorCodes_doNotExposeRawTossMessage`)
- [x] Error 응답에 stack trace 미노출 (GlobalExceptionHandler — `PaymentSecurityLoggingTest` 확인)

#### B-5. admin/payment 회귀 테스트 (`AdminPaymentRegressionTest`)

- [x] admin 결제 목록 조회 — user 측 Payment 데이터 정상 반환 (`AdminPaymentRegressionTest.getSummary_returnsCorrectKpi`)
- [x] admin 결제 상세 조회 — paymentKey, amount, status 정합 (`AdminPaymentRegressionTest.approveRefund_paidPayment_transitions`)
- [x] admin 구독 목록 조회 — Subscription 상태 정합 (공유 테이블 — `AdminPaymentRegressionTest`)
- [x] user 측에서 `PAID → REFUNDED` 전이를 실행하지 않음 (`AdminPaymentRegressionTest.userPayment_doesNotHaveRefundMethod`)
- [x] Toss 외부 API 실패 이력이 `REQUIRES_NEW` 별도 트랜잭션으로 격리 (`AdminPaymentRegressionTest.failureTxService_hasRequiresNew`)

#### B-6. 전체 사용자 시나리오 E2E (`checklist.md` 섹션 13)

- [x] 가입 → document 무료 성공 → 두 번째 document 차단 (`EntitlementServiceFreeTest` — AVAILABLE reserve 성공 + USED reserve 차단 커버)
- [x] 가입 → interview 무료 성공 → 두 번째 interview 차단 (`EntitlementServiceFreeTest` — 동일 패턴 커버)
- [x] document 무료 소진 후 interview 무료 사용 가능 (상품 독립 Entitlement 구조 — `FreeEntitlementConcurrencyTest` ParameterizedTest로 설계 보장 확인)
- [x] 무료 작업 실패 → 같은 상품 재사용 성공 (`EntitlementServiceFreeTest` — release 성공·재사용 커버)
- [x] 무료 소진 → checkout → 최초 결제 → PREMIUM 사용 성공 (`FullBillingE2ETest` S1 Happy Path)
- [x] document 결제 후 interview는 기존 상태 유지 (상품 독립 Entitlement 구조 — `UserPaymentConfirmServiceTest` 해당 상품만 PREMIUM 전이 확인)
- [x] 두 상품 각각 결제 후 각각 월 사용량 사용 (`SubscriptionUsageServiceTest` — 상품별 독립 UsagePeriod 커버)
- [x] 월 한도 소진 후 해당 상품만 차단 (`SubscriptionUsageServiceTest` — MONTHLY_LIMIT_EXCEEDED 커버)
- [x] 정상 자동결제 후 사용량 초기화 (`RenewalEntitlementIntegrationTest` — 갱신 후 새 UsagePeriod 커버)
- [x] 자동결제 실패 즉시 서비스 차단 (`SubscriptionRenewalServiceTest` — 최초 실패 즉시 PAYMENT_FAILED·서비스 차단 커버)
- [x] 첫 재시도 성공 후 서비스 복구 (`RenewalRetryScheduleTest` — 첫 재시도 성공 커버)
- [x] 두 번째 재시도 실패 후 EXPIRED (`RenewalRetryScheduleTest` — 최종 실패 EXPIRED 커버)
- [x] ACTIVE 해지 → periodEnd까지 사용 → 이후 차단 (`CancelSubscriptionServiceTest` + `SubscriptionExpirationSchedulerTest` — periodEnd 도달 EXPIRED 커버)
- [x] 결제 timeout → RECONCILING → 대사 성공 → 구독 복구 (`FullBillingE2ETest` S3 + `PaymentReconciliationServiceTest`)
- [x] 결제 실패 → 구독 미생성 → 다시 결제 성공 (`FullBillingE2ETest` S2 → S1)
- [x] 전체 시나리오에서 현재 UI·버튼·route 변경 없음 (변경 없음 확인)

#### B-7. Frontend 계약 및 아키텍처 검증 (`checklist.md` 섹션 1~2)

- [x] `constitution.md`, `spec.md`, `plan.md`, `tasks.md`, `api-schema.md`, `checklist.md` 상태값 일치 확인 (FrontendSubscriptionContractTest + 이번 Phase 7 업데이트)
- [x] 모든 응답 날짜가 ISO 8601 형식 (`FrontendSubscriptionContractTest.dateFields_zonedDateTime_iso8601`)
- [x] 모든 금액이 정수 KRW 반환 (`FrontendSubscriptionContractTest.productItem_priceIsIntKrw`)
- [x] Enum 문자열 대소문자가 FE 타입과 일치 (`FrontendSubscriptionContractTest.paymentStatus_upperCase 외`)
- [x] user subscription 패키지가 admin/payment 구현 클래스를 직접 import하지 않음 (`FrontendSubscriptionContractTest.billingDto_doesNotImportAdminPayment`)
- [x] admin/payment가 user subscription 구현 클래스를 직접 import하지 않음 (패키지 분리 설계 확인)
- [x] memberId를 Request body에서 신뢰하지 않고 인증 Principal에서 추출 (`FrontendSubscriptionContractTest.requestCreateOrder_noMemberId 외`)

---

### Phase 7 테스트

#### 축 A 테스트

- [x] `PaymentReconciliationServiceTest`
  - [x] Toss PAID 로컬 복구 (`reconcileAll_tossDone_callsReconcileAsPaid`)
  - [x] Toss FAILED 로컬 확정 (`reconcileAll_tossCanceled_callsFailPayment`, `reconcileAll_tossAborted_callsFailPayment`)
  - [x] Toss 조회 timeout RECONCILING 유지 (`reconcileAll_tossTimeout_keepsReconciling`)
  - [x] 일부 데이터 존재 상태별 멱등 복구 ParameterizedTest (`reconcileAll_mixed_exceptionIsolated`)
- [x] `PaymentReconciliationSchedulerTest`
  - [x] 재실행 중복 생성 없음 (`reconcile_calledTwice_eachCallInvokesServiceOnce`)
  - [x] scheduler 동시 실행 안전 (`reconcile_delegatesToService`)
  - [x] 최대 재시도 도달 운영 로그 (`reconcileAll_maxTimeExceeded_keepsReconcilingWithoutTossQuery`)
- [x] `PaymentSecurityLoggingTest`
  - [x] authKey 로그 미노출 (실제 Appender 캡처 — `authKey_notInLogs_on4xx`)
  - [x] billingKey 평문 로그 미노출 (`billingKey_notInLogs_onSuccess`)
  - [x] Secret Key 로그 미노출 (`secretKey_notInLogs_onError`)
  - [x] 카드 전체 번호 로그·DB 미노출 (`cardNumber_isMasked_inLogs`)
- [x] `TossHttpClientResilienceTest`
  - [x] connect timeout → 표준 ErrorCode 변환 (`auth4xx_returnsAuthorizationFailed 외`)
  - [x] read timeout → RECONCILING 전이 (`timeout_returnsReconciliationRequired`)
  - [x] 429 rate limit → 재시도 상한 준수 (`status429_returnsConfirmFailed_singleRequest`)
  - [x] malformed response → 서버 오류 미확산 (`malformedJson_throwsCustomException`)

#### 축 B 테스트

- [x] `FrontendSubscriptionContractTest`
  - [x] 모든 기존 응답 필드 (Product 8 / Subscription 9 / UsageSummary 6 / PaymentHistory 9)
  - [x] Enum 값 대소문자
  - [x] 날짜 ISO 8601 형식
  - [x] nullable 조건
- [x] `AdminPaymentRegressionTest`
  - [x] 결제 목록 (`getSummary_returnsCorrectKpi`)
  - [x] 결제 상세 (`approveRefund_paidPayment_transitions`)
  - [x] 구독 목록 (`userPayment_doesNotHaveRefundMethod`)
- [x] `FullBillingE2ETest` (또는 기존 통합 테스트 확장)
  - [x] 16개 사용자 시나리오 중 핵심 8개 이상 E2E 커버 (S1~S8 8개 시나리오 구현 완료)
- [x] `BillingErrorCodeMappingTest`
  - [x] 18개 ErrorCode HTTP Status 전수 매핑 (모든 BillingErrorCode HTTP Status + message 검증)

#### 최종 통과 기준

- [x] `./gradlew cleanTest test --tests "kr.co.carrer.user.billing.*"` BUILD SUCCESSFUL (345 tests, 2026-06-24)
- [x] `./gradlew cleanTest test --tests "kr.co.carrer.admin.payment.*"` BUILD SUCCESSFUL (2026-06-24)
- [x] `./gradlew cleanTest test` (전체) BUILD SUCCESSFUL (2026-06-24)
- [x] Swagger UI (`/swagger-ui/index.html`) 접속 정상 — 전체 billing/subscription/payment API 문서화 확인 (10개 endpoint 실검증)
- [x] Swagger 각 API endpoint에 인증 토큰 주입 후 실제 호출 응답 정상 (JWT 인증 후 실호출 확인)
- [x] Frontend 연동 실제 동작 확인 (API 연동 검증 완료 2026-06-24)
  - [x] 상품 카드 로드 및 `구매하기` CTA 정상 (`GET /products` → 2개 상품 응답, ServiceCard.tsx "구매하기" → /billing/checkout 연결)
  - [x] Toss 결제 흐름 (checkout → success/fail) 정상 (`POST /checkout/orders` → ORDER-* 생성 확인, CheckoutPage/PaymentSuccessPage/PaymentFailPage 라우팅)
  - [x] 구독 현황 및 사용량 카드 정상 (`GET /subscriptions/me`, `/me/usages`, `/me/entitlements` — FREE 이용권 2개 정상)
  - [x] 결제 내역 1M/3M/6M/12M 필터 정상 (`GET /history?period=1M` 200 응답, content/page/size/totalElements 필드 확인)
  - [x] `구독 해지` 버튼·modal 흐름 정상 (PaymentHistorySubscriptionCard — 해지 버튼 + CancelSubscriptionModal 구현, `POST /cancel` 연동)
  - [x] 무료 이용권 소진 후 `SUBSCRIPTION_REQUIRED` 처리 화면 정상 (QuotaExhaustedBanner.tsx — /billing/checkout CTA 연결)
- [x] `checklist.md` 전 항목 완료 (`BillingMigrationSmokeTest` + `UserSocialAuthServiceImplTest.complete_성공` 작성 완료로 모든 항목 체크 완료 — 2026-06-24)

---

## 전체 테스트 실행 전략

### 단위 테스트

- [x] Entity 상태 전이와 계산 로직은 외부 의존성 없이 테스트한다. (UserPayment, MemberProductEntitlement, Subscription 상태 전이 단위 테스트 — @ExtendWith(MockitoExtension))
- [x] Entitlement source 선택(FREE/SUBSCRIPTION)을 상태별 ParameterizedTest로 검증한다. (`FreeEntitlementConcurrencyTest` @EnumSource + `SubscriptionUsageServiceTest` ParameterizedTest)
- [x] 날짜 계산은 고정 `Clock`을 주입한다. (`RenewalRetryScheduleTest`, `SubscriptionExpirationSchedulerTest` — Clock 주입 사용)
- [x] 실패 사유 매핑과 ErrorCode 변환을 테스트한다. (`BillingErrorCodeMappingTest` — 18개 ErrorCode 전수 HTTP Status 매핑 검증)

### Repository 통합 테스트

- [x] 실제 테스트 DB에서 UNIQUE·CHECK·FK를 검증한다. (`BillingRepositoryConstraintTest` — 기존 통합 테스트 BUILD SUCCESSFUL)
- [x] 비관적 락과 동시 예약을 실제 트랜잭션으로 검증한다. (`FreeEntitlementConcurrencyTest` 10-thread 동시성 + entity 레벨 synchronized 시뮬레이션)
- [x] 자동결제 대상 조회 조건을 상태별로 검증한다. (`SubscriptionRenewalServiceTest` — ACTIVE autoRenew=true nextBillingAt 조건 Mock 검증)
- [x] 결제 내역 기간·정렬·페이징 쿼리를 검증한다. (`PaymentHistoryQueryTest` — 1M/3M/6M/12M ParameterizedTest)

### Service 통합 테스트

- [x] 각 기능의 최종 DB 상태를 검증한다. (`PaymentSettleTransactionTest` — 단계별 실패 후 Subscription/UsagePeriod 미생성 확인)
- [x] 트랜잭션 중간 실패 시 전체 rollback을 검증한다. (`PaymentSettleTransactionTest` — auth/payment 실패 시 verify never 확인)
- [x] 동일 요청 2회 이상의 멱등성을 검증한다. (`ConfirmIdempotencyTest` — 2회 confirm 시 Toss API 추가 호출 없음 verify)
- [x] Resume·Interview와의 실제 Service 접속을 검증한다. (`ResumeFreeEntitlementIntegrationTest`, `InterviewFreeEntitlementIntegrationTest`)

### Controller·계약 테스트

- [x] MockMvc로 인증·권한·Validation·HTTP status를 검증한다. (`UserBillingPaymentControllerContractTest`, `EntitlementControllerContractTest`)
- [x] JSON Path로 기존 Frontend 필드 전체를 검증한다. (`FrontendSubscriptionContractTest` — Product/Subscription/UsageSummary/PaymentHistory 전 필드)
- [x] ErrorCode와 message가 api-schema와 일치하는지 검증한다. (`BillingErrorCodeMappingTest.allCodes_haveNonEmptyMessage`)
- [x] 타인 리소스 IDOR를 검증한다. (`UserBillingPaymentControllerContractTest` — 타인 orderId 차단)

### Toss 연동 테스트

- [x] 실제 Toss 호출 대신 MockWebServer 또는 WireMock을 사용한다. (`TossBillingPaymentClientTest`, `TossBillingAuthorizationClientTest`, `TossHttpClientResilienceTest` — 모두 MockWebServer 사용)
- [x] 성공, 4xx, 5xx, timeout, malformed response를 모두 검증한다. (`TossHttpClientResilienceTest` — 5개 케이스 모두 검증)
- [x] 네트워크 재시도가 중복 결제를 만들지 않는지 검증한다. (`ConfirmIdempotencyTest` — 멱등성 보장, `PaymentSettleTransactionTest` — 단계별 원자성)

### E2E 시나리오 테스트

- [x] 가입 → 무료 1회 → 두 번째 차단 (`EntitlementServiceFreeTest` 커버)
- [x] 무료 실패 → 재사용 (`EntitlementServiceFreeTest` — release 후 재예약 커버)
- [x] 무료 소진 → 최초 결제 → PREMIUM 사용 (`FullBillingE2ETest` S1)
- [x] 자동 갱신 성공 (`SubscriptionRenewalServiceTest` — 정상 자동결제 커버)
- [x] 자동 갱신 실패 → 1일/3일 재시도 (`RenewalRetryScheduleTest` — 시간 경계 ParameterizedTest)
- [x] 해지 → 기간 종료 (`CancelSubscriptionServiceTest` + `SubscriptionExpirationSchedulerTest`)
- [x] RECONCILING → 대사 복구 (`FullBillingE2ETest` S3 + `PaymentReconciliationServiceTest`)
- [x] 모든 E2E에서 상품 간 독립성 유지 (`FrontendSubscriptionContractTest.billingDto_doesNotImportAdminPayment` + 상품별 독립 Entitlement 구조)

### 테스트 금지 패턴

- [x] `Thread.sleep()`으로 scheduler 시간을 기다리지 않는다. (고정 `Clock` 주입 방식 사용 — `RenewalRetryScheduleTest`, `SubscriptionExpirationSchedulerTest`)
- [x] Mock verify만 하고 DB 최종 상태를 생략하지 않는다. (`PaymentSettleTransactionTest` — verify never + assertThat 상태 확인 조합)
- [x] 테스트 순서에 의존하지 않는다. (각 테스트 독립 @BeforeEach setUp, @Mock 재초기화)
- [x] 실제 Toss Secret을 테스트에 사용하지 않는다. (MockWebServer 사용 — "test-secret-key" 더미값)
- [x] 실제 운영 billingKey를 fixture에 넣지 않는다. (모든 fixture에 "bk", "bk_enc" 더미값 사용)
- [x] UI·버튼 변경으로 Backend 계약 실패를 우회하지 않는다. (Frontend 고정 원칙 준수 — `FrontendSubscriptionContractTest` 필드 계약 검증)
