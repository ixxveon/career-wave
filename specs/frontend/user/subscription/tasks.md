# Tasks: User Subscription & Billing

> `plan.md`의 Project Phase Alignment를 따른다.  
> 각 항목은 하나의 커밋 또는 하나의 PR 리뷰 단위로 쪼갤 수 있어야 한다.

> 프로젝트 순서:
> `feature/user-subscription-setup` → `feature/user-payment-history` → `feature/user-billing` → `feature/user-frontend-qa`

---

## Phase 5 — Subscription

- [x] `types/subscription.ts` 타입 정의: `ProductCode`, `BillingCycle`, `SubscriptionStatus`, `PaymentStatus`, `PaymentFailureReason` enum + `Product`, `Subscription`, `UsageSummary`, `PaymentOrder`, `PaymentHistory`, `PaymentFailure`, `Entitlements` interface
- [x] `api/subscription/subscriptionApi.ts` 신설: `getProducts`, `getMySubscriptions`, `getUsages`, `getEntitlements` 4개 endpoint (PR #179)
- [x] `hooks/subscription/` 신설: `queryKeys.ts` + `useProducts`, `useMySubscriptions`, `useUsages`, `useEntitlements` TanStack Query 훅 (PR #179)
- [x] `utils/subscription/subscriptionView.ts` 신설: 뷰 상수(PRODUCT_ACCENT, PRODUCT_TITLE 등), `formatBillingDate`, `buildUsageItems`, `UsageItem` 타입
- [x] `components/subscription/` 신설: `UsageStatusCard`, `RecommendationCard`, `UsageSectionSkeleton`
- [x] 상품 목록/상세 API 응답 타입 정의 (`Product` interface)
- [x] `/mypage/subscription` 상단 AI 서비스 소개와 CTA 상태 정리
- [x] 구독 없음 empty state와 2개 CTA 구현/정리
- [x] 단일 구독 상태: 구독중 상품 사용량 카드 + 다른 상품 추천 카드 구조 정리
- [x] 2개 구독 상태: 2개 사용량 카드 동시 표시 구조 정리
- [x] 사용량 progress/remaining UI에서 한도 초과/데이터 없음 상태 처리
- [ ] ERD 초안에서 누락된 결제/구독 테이블 요구사항 정리 (백엔드 계약 확정 후 진행)

## Phase 6 — Payment History

- [x] `/mypage/payment-history` 내 구독 내역 영역을 contract 기준으로 정리
- [x] 구독 없음 상태 CTA와 recommendation card 정리
- [x] 구독 해지 버튼 및 confirm modal 구현 정리 (ESC 키 + 초기 포커스 포함)
- [x] 해지 신청 완료 후 `CANCEL_SCHEDULED` 상태, 자동 결제 해지 예정 문구, success message 처리
- [x] 최근 결제 내역 empty state 구현 정리
- [x] 결제 내역 있음 상태: 기간 필터(1M/3M/6M/12M), compact row, pagination 실데이터 기준 전환
- [x] 결제내역 유의사항 하단 안내 박스 유지
- [x] `billingApi.ts` 신설: `getPaymentHistory` (GET /api/v1/billing/payments/history)
- [x] `subscriptionApi.ts`에 `cancelSubscription` 추가 (POST /api/v1/subscriptions/{subscriptionId}/cancel)
- [x] `usePaymentHistory` TanStack Query 훅
- [x] `useCancelSubscription` mutation 훅 (해지 후 구독/사용량/권한 query invalidation)
- [x] `usePaymentHistoryStatus` 훅 — 데이터 변환·분기·핸들러 캡슐화
- [x] `PaymentHistorySubscriptionCard`, `CancelSubscriptionModal`, `PaymentHistoryList` 컴포넌트
- [x] `SubscriptionHistorySection`, `PaymentHistorySection`, `BillingNoticeSection` 섹션 컴포넌트
- [x] `PAYMENT_FAILED` 구독 카드 노출 및 결제 실패 경고 표시
- [x] 결제 내역 행에 `paymentStatus` 배지 추가 (완료/실패/취소/환불 구분)

## Phase 7 — Billing

- [x] `/billing/checkout`에서 `product` query 파싱 및 유효성 검증 구현
- [x] 잘못된 product query 또는 누락 시 fallback/error state 구현
- [x] checkout 진입 시 서버 상품 정보 조회 (useProducts 훅, mock billingProducts.ts 제거)
- [x] 상품 정보 카드(CheckoutProductCard), 결제 요약 카드(CheckoutSummaryCard), 자동 결제 안내 문구 정리
- [x] 결제 동의 체크박스 및 미동의 클릭 안내 구현
- [x] 동의 후 order 생성 요청(useCreateOrder), 요청 중 버튼 disabled 중복 클릭 방지 구현
- [x] Toss Payments SDK requestPayment 연동 (createOrder 응답 기반)
- [x] `/billing/success`에서 confirmPayment 후 loading·success·error 상태 UI 표시
- [x] `/billing/fail`에서 PaymentFailureReason 6종 실패 사유 구분, 다시 결제하기·AI 서비스로 돌아가기 CTA 구현
- [x] success/fail URL 직접 접근 방어 (orderId 없으면 /mypage/subscription 리다이렉트)
- [x] useCheckoutStatus·usePaymentSuccessStatus·usePaymentFailStatus 훅으로 페이지 로직 캡슐화
- [x] billingProducts.ts mock 파일 삭제

## Phase 8 — Frontend QA

- [ ] Toss success redirect 파라미터 `paymentKey`, `orderId`, `amount` 처리 계약 점검
- [ ] confirm API amount/order 검증 흐름과 프론트 표시값 정렬
- [ ] orderId/idempotency key 기반 중복 결제 방지 검증
- [ ] 제재/블랙리스트/승인 대기 회원의 결제 제한 응답 처리
- [ ] 결제 민감정보가 localStorage/sessionStorage/console에 남지 않는지 확인
- [ ] 해지 confirm modal 포커스 이동 및 키보드 조작 확인
- [ ] 모바일 375px 기준 상품 카드, checkout 요약, payment row가 깨지지 않는지 확인
- [ ] mock 결제 flow와 production 경계 확인
- [ ] `checklist.md` 기반 최종 점검 및 build 통과 확인
