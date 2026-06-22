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
- [ ] migration 적용 테스트
  - [ ] 빈 DB
  - [ ] 기존 데이터 DB
  - [ ] 재실행 안전성
- [ ] 현재 Frontend `Product`, `Subscription`, `UsageSummary`, `PaymentHistory` 필드와 Entity/DTO 매핑표 작성

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
- [ ] 기존 Frontend가 기대하는 `entitlements` 응답 형태를 깨뜨리지 않는 호환 DTO 확정

### Phase 2 테스트

- [x] `MemberEntitlementInitializerTest`
  - [x] 일반 회원 가입 후 두 상품 FREE 권한 생성
  - [ ] 소셜 회원 가입 후 두 상품 FREE 권한 생성 (UserSocialAuthServiceImplTest로 별도 검증)
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
- [ ] Resume 무료 사용이 Interview 무료 횟수에 영향을 주지 않는다.

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

- [ ] `POST /api/v1/user/billing/checkout/orders`
- [ ] ROLE_USER 및 회원 ACTIVE 검증
- [ ] 상품 존재·판매 상태 검증
- [ ] ACTIVE, CANCEL_SCHEDULED, PAYMENT_FAILED 중복 구독 차단
- [ ] 서버 DB 가격·통화 확정
- [ ] billing consent 약관 버전 저장
- [ ] orderId, idempotencyKey, customerKey 서버 생성
- [ ] READY / MANUAL Payment 저장
- [ ] 동일 idempotency 요청 기존 주문 반환
- [ ] 주문 만료 검증
- [ ] 현재 `구매하기`·추천 CTA의 `?product=document-coaching|interview` query 그대로 지원
- [ ] 현재 checkout 버튼 disabled 흐름과 중복 요청 방지를 Backend idempotency로 보강
- [ ] READY 주문 유효 시간 설정 (created_at 기준 30분)
- [ ] 유효 시간 초과 READY 주문 일괄 CANCELED 전이 스케줄러
- [ ] CANCELED 주문 중복 구독 검증 제외
- [ ] 만료 조회 인덱스 (payment_status=READY, created_at)

### 결제 중 검증

- [ ] 사용자 승인 전 Frontend `requestPayment()` 내부 호출 변경 금지
- [ ] 사용자 승인 후에도 버튼 UI·문구·위치·disabled 동작 유지
- [ ] 승인 후 Toss billing authorization SDK 호출로 내부 연동 교체
- [ ] 승인 후 success redirect 파라미터를 confirm 요청에 매핑
- [ ] 현재 API 이름 `POST /api/v1/user/billing/payments/confirm` 유지
- [ ] READY 주문 소유권 검증
- [ ] customerKey 비교 검증
- [ ] authKey 단일 사용 처리
- [ ] Toss billing authorization Client 구현
- [ ] billingKey 암호화 저장
- [ ] 카드사·마스킹 카드번호 저장
- [ ] Payment READY → AUTHORIZED 전이
- [ ] billingKey 최초 결제 Client 구현
- [ ] Payment AUTHORIZED → CONFIRMING 전이

### 결제 후 검증 및 구독 활성화

- [ ] Toss orderId, amount, currency=KRW 검증
- [ ] Toss 결제 완료 상태 검증
- [ ] paymentKey UNIQUE 검증
- [ ] Payment PAID 전이
- [ ] Subscription ACTIVE 생성
- [ ] 결제한 상품의 MemberProductEntitlement만 PREMIUM 전이
- [ ] 미사용 무료 이용권 FORFEITED 처리
- [ ] 첫 SubscriptionUsagePeriod 생성
- [ ] nextBillingAt 설정
- [ ] 결제·구독·권한·사용량 단일 트랜잭션 처리
- [ ] `GET /api/v1/user/billing/payments/orders/{orderId}`
- [ ] 현재 success UI가 표시하는 상품명·금액·결제일·다음 결제일·결제 상태 필드 제공
- [ ] 현재 fail UI의 동일 상품 checkout 재진입에 필요한 productCode 보존
- [ ] `POST /api/v1/user/billing/payments/fail` 기존 Request 필드 수용
- [ ] fail 페이지 호출이 중복되어도 실패 기록 멱등 처리

### Phase 4 테스트

- [ ] `CheckoutOrderServiceTest`
  - [ ] document/interview READY 주문 생성
  - [ ] 서버 가격 사용
  - [ ] 계정·상품·중복 구독 차단
  - [ ] idempotencyKey 동일 요청 동일 주문 반환
  - [ ] 만료 주문 confirm 차단
- [ ] `TossBillingAuthorizationClientTest`
  - [ ] 성공
  - [ ] 4xx
  - [ ] 5xx
  - [ ] timeout
  - [ ] malformed response
- [ ] `InitialBillingPaymentServiceTest`
  - [ ] document 최초 결제 후 document만 PREMIUM
  - [ ] interview 최초 결제 후 interview만 PREMIUM
  - [ ] 첫 월 사용량 즉시 발급
  - [ ] customerKey 불일치 차단
  - [ ] orderId·amount·currency 불일치 차단
  - [ ] paymentKey 중복 차단
- [ ] `InitialPaymentTransactionIntegrationTest`
  - [ ] Payment 저장 실패 rollback
  - [ ] Subscription 저장 실패 rollback
  - [ ] Entitlement 변경 실패 rollback
  - [ ] UsagePeriod 생성 실패 rollback
- [ ] `InitialPaymentIdempotencyTest`
  - [ ] 동일 orderId confirm 2회
  - [ ] 동일 orderId 동시 confirm 2건
  - [ ] 동일 paymentKey 다른 order 차단
- [ ] `BillingControllerContractTest`
  - [ ] CreateOrderResponse 기존 필드
  - [ ] ConfirmPaymentResponse 기존 필드
  - [ ] fail API 기존 Request
  - [ ] success/fail 직접 접근으로 구독 미생성
- [ ] `OrderExpirationSchedulerTest`
  - [ ] 유효 시간 이내 READY 주문 상태 유지
  - [ ] 유효 시간 초과 READY 주문 CANCELED 전이
  - [ ] 만료 주문 confirm 요청 시 `BILLING_ORDER_NOT_READY`
  - [ ] 이미 AUTHORIZED·PAID·CANCELED 주문 중복 처리 없음
  - [ ] 만료 후 동일 상품 신규 주문 생성 가능
- [ ] `BillingSensitiveDataTest`
  - [ ] billingKey API 미노출
  - [ ] billingKey·authKey·Secret 로그 미노출

## Phase 5 — 월 자동결제 및 실패 재시도 전체 흐름 완성

- [ ] 자동결제 대상 조회 쿼리
- [ ] 구독 단위 중복 실행 방지 락
- [ ] ACTIVE + autoRenew=true + nextBillingAt 도달 조건
- [ ] AUTO_RENEWAL Payment 생성 (attemptSequence=0)
- [ ] 정상 자동결제 성공 처리
- [ ] 성공 시각 기준 새 UsagePeriod 생성
- [ ] 최초 실패 즉시 PAYMENT_FAILED 전이
- [ ] 최초 실패 즉시 서비스 권한 차단
- [ ] paymentFailedAt 기록
- [ ] 1일째 첫 번째 AUTO_RENEWAL Payment 실행 (attemptSequence=1)
- [ ] 첫 실패 후 3일째 두 번째 AUTO_RENEWAL Payment 실행 (attemptSequence=2)
- [ ] 재시도 성공 시 ACTIVE 복구
- [ ] 재시도 성공 시 성공 시각 기준 새 기간 생성
- [ ] 두 번째 실패 시 EXPIRED 전이
- [ ] 두 번째 실패 시 autoRenew=false, nextBillingAt=null
- [ ] 스케줄러 timezone Asia/Seoul 고정

### Phase 5 테스트

- [ ] `SubscriptionRenewalServiceTest`
  - [ ] 정상 자동결제 후 새 월 사용량 발급
  - [ ] 이전 잔여량 미이월
  - [ ] 최초 실패 즉시 PAYMENT_FAILED·서비스 차단
  - [ ] 첫 재시도 성공
  - [ ] 첫 실패·두 번째 성공
  - [ ] 최종 실패 EXPIRED
- [ ] `RenewalRetryScheduleTest` (`Clock` 주입)
  - [ ] 실패 당일 재시도 없음
  - [ ] +1일 직전 없음 / 정확히 +1일 실행
  - [ ] +3일 직전 없음 / 정확히 +3일 실행
  - [ ] Asia/Seoul 기준
  - [ ] 월말·윤년 경계
- [ ] `RenewalSchedulerConcurrencyTest`
  - [ ] scheduler 2개 동시 실행
  - [ ] 동일 subscription 1회 결제
  - [ ] 동일 idempotencyKey 재실행 안전
- [ ] `RenewalEntitlementIntegrationTest`
  - [ ] 실패 즉시 Resume/Interview 차단
  - [ ] 재시도 성공 즉시 서비스 복구
  - [ ] 최종 실패 후 계속 차단
- [ ] 최종 실패 이후 추가 자동결제가 실행되지 않는다.

## Phase 6 — 구독 해지 및 결제 내역 전체 흐름 완성

- [ ] `POST /api/v1/user/subscriptions/{subscriptionId}/cancel`
- [ ] 본인 구독 소유권 검증
- [ ] ACTIVE 상태에서만 해지 허용
- [ ] CANCEL_SCHEDULED, autoRenew=false 전이
- [ ] 현재 periodEnd까지 서비스 허용
- [ ] periodEnd 도달 EXPIRED 스케줄러
- [ ] 무료 이용권 재발급 금지
- [ ] `GET /api/v1/user/billing/payments/history`
- [ ] 1M, 3M, 6M, 12M 기간 필터
- [ ] 0-based 페이지네이션
- [ ] 결제 최신순 정렬
- [ ] MANUAL, AUTO_RENEWAL 유형 반환 (재시도 구분은 attemptSequence로 표시)
- [ ] 현재 `구독 해지` 버튼은 ACTIVE일 때만 표시될 수 있도록 응답 상태 정렬
- [ ] 현재 해지 modal 문구와 일치하도록 `CANCEL_SCHEDULED`, `currentPeriodEnd`, `cancelScheduledAt` 반환
- [ ] 현재 결제 내역 UI의 1M/3M/6M/12M 필터 지원
- [ ] 현재 UI page=1 표시와 API page=0 변환 계약 유지

### Phase 6 테스트

- [ ] `CancelSubscriptionServiceTest`
  - [ ] ACTIVE 해지 성공
  - [ ] 상태별 해지 허용/거부 ParameterizedTest
  - [ ] 중복 해지 요청
  - [ ] 타인 subscriptionId 차단
  - [ ] Refund 미생성
- [ ] `SubscriptionExpirationSchedulerTest` (`Clock` 주입)
  - [ ] periodEnd 직전 사용 가능
  - [ ] periodEnd 정확히 도달 시 EXPIRED
  - [ ] 무료 이용권 미재발급
- [ ] `ProductIndependentCancellationTest`
  - [ ] document 해지가 interview에 영향 없음
  - [ ] interview 해지가 document에 영향 없음
- [ ] `PaymentHistoryQueryTest`
  - [ ] 1M/3M/6M/12M 경계 ParameterizedTest
  - [ ] 최신순 정렬
  - [ ] 빈 목록
  - [ ] 첫·중간·마지막·범위 초과 페이지
  - [ ] totalElements/totalPages
- [ ] `PaymentHistoryControllerContractTest`
  - [ ] 기존 PaymentHistory 필드
  - [ ] 0-based API page
  - [ ] MANUAL/AUTO_RENEWAL 확장 필드

## Phase 7 — 결제 상태 대사 및 운영 안전성 완성

- [ ] billingKey 암호화 키 환경 변수 분리
- [ ] Toss Client Key와 Secret Key 환경 변수 분리
- [ ] 결제 로그 민감정보 마스킹
- [ ] 모든 Toss 외부 호출 timeout 설정
- [ ] Toss timeout Payment RECONCILING 전이
- [ ] RECONCILING 대사 스케줄러
- [ ] Toss 조회 결과 PAID 시 로컬 결제·구독·권한 멱등 복구
- [ ] Toss 조회 결과 FAILED 시 로컬 실패 확정
- [ ] Swagger Docs 분리
- [ ] FE api-schema 계약 정렬
- [ ] admin/payment 조회 계약 정렬
- [ ] 현재 Frontend UI·버튼·route 변경 없이 전체 사용자 시나리오 검증
- [ ] UI 또는 버튼 변경 필요 항목이 발견되면 코드 수정 없이 승인 요청 목록으로 분리

### Phase 7 테스트

- [ ] `PaymentReconciliationServiceTest`
  - [ ] Toss PAID 로컬 복구
  - [ ] Toss FAILED 로컬 확정
  - [ ] Toss 조회 timeout RECONCILING 유지
  - [ ] 일부 데이터 존재 상태별 멱등 복구
- [ ] `PaymentReconciliationSchedulerTest`
  - [ ] 재실행 중복 생성 없음
  - [ ] scheduler 동시 실행 안전
  - [ ] 최대 재시도 도달 운영 로그
- [ ] `PaymentSecurityLoggingTest`
  - [ ] authKey 미노출
  - [ ] billingKey 미노출
  - [ ] Secret Key 미노출
  - [ ] 카드 전체 번호 미노출
- [ ] `TossHttpClientResilienceTest`
  - [ ] connect timeout
  - [ ] read timeout
  - [ ] 429 제한
  - [ ] malformed response
- [ ] `FrontendSubscriptionContractTest`
  - [ ] 모든 기존 응답 필드
  - [ ] Enum 값
  - [ ] 날짜 형식
  - [ ] nullable 조건
- [ ] `AdminPaymentRegressionTest`
  - [ ] 결제 목록
  - [ ] 결제 상세
  - [ ] 구독 목록
- [ ] `checklist.md` 전 항목 완료

---

## 전체 테스트 실행 전략

### 단위 테스트

- [ ] Entity 상태 전이와 계산 로직은 외부 의존성 없이 테스트한다.
- [ ] Entitlement source 선택(FREE/SUBSCRIPTION)을 상태별 ParameterizedTest로 검증한다.
- [ ] 날짜 계산은 고정 `Clock`을 주입한다.
- [ ] 실패 사유 매핑과 ErrorCode 변환을 테스트한다.

### Repository 통합 테스트

- [ ] 실제 테스트 DB에서 UNIQUE·CHECK·FK를 검증한다.
- [ ] 비관적 락과 동시 예약을 실제 트랜잭션으로 검증한다.
- [ ] 자동결제 대상 조회 조건을 상태별로 검증한다.
- [ ] 결제 내역 기간·정렬·페이징 쿼리를 검증한다.

### Service 통합 테스트

- [ ] 각 기능의 최종 DB 상태를 검증한다.
- [ ] 트랜잭션 중간 실패 시 전체 rollback을 검증한다.
- [ ] 동일 요청 2회 이상의 멱등성을 검증한다.
- [ ] Resume·Interview와의 실제 Service 접속을 검증한다.

### Controller·계약 테스트

- [ ] MockMvc로 인증·권한·Validation·HTTP status를 검증한다.
- [ ] JSON Path로 기존 Frontend 필드 전체를 검증한다.
- [ ] ErrorCode와 message가 api-schema와 일치하는지 검증한다.
- [ ] 타인 리소스 IDOR를 검증한다.

### Toss 연동 테스트

- [ ] 실제 Toss 호출 대신 MockWebServer 또는 WireMock을 사용한다.
- [ ] 성공, 4xx, 5xx, timeout, malformed response를 모두 검증한다.
- [ ] 네트워크 재시도가 중복 결제를 만들지 않는지 검증한다.

### E2E 시나리오 테스트

- [ ] 가입 → 무료 1회 → 두 번째 차단
- [ ] 무료 실패 → 재사용
- [ ] 무료 소진 → 최초 결제 → PREMIUM 사용
- [ ] 자동 갱신 성공
- [ ] 자동 갱신 실패 → 1일/3일 재시도
- [ ] 해지 → 기간 종료
- [ ] RECONCILING → 대사 복구
- [ ] 모든 E2E에서 상품 간 독립성 유지

### 테스트 금지 패턴

- [ ] `Thread.sleep()`으로 scheduler 시간을 기다리지 않는다.
- [ ] Mock verify만 하고 DB 최종 상태를 생략하지 않는다.
- [ ] 테스트 순서에 의존하지 않는다.
- [ ] 실제 Toss Secret을 테스트에 사용하지 않는다.
- [ ] 실제 운영 billingKey를 fixture에 넣지 않는다.
- [ ] UI·버튼 변경으로 Backend 계약 실패를 우회하지 않는다.
