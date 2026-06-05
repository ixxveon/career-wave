# Implementation Plan: User Subscription & Billing

> 작성자: 마은재 | 작성일: 2026-05-31  
> 최근 정리일: 2026-06-03  
> 관련 문서: `constitution.md` / `tasks.md` / `spec.md` / `api-schema.md` / `checklist.md`  
> 레이어: **Frontend Only / Backend Ready**

---

## Summary

사용자 구독/결제 도메인은 마이페이지 구독 현황, AI 서비스 사용량, 결제 내역, checkout/success/fail, 구독 해지를 하나의 결제 경험으로 제공한다.  
현재 코드베이스에는 구독/결제 화면 UI가 먼저 존재하지만, API 계층, 타입, query, 실제 결제 confirm 흐름은 아직 spec 수준에서만 정의된 부분이 많다.

## Project Phase Alignment

팀에서 확정한 사용자 프론트 개발 순서를 기준으로 Subscription/Billing 도메인은 아래처럼 매핑한다.

| Project Phase | Branch | Subscription/Billing Scope |
|---------------|--------|----------------------------|
| Phase 5 | `feature/user-subscription` | 구독 현황, 사용량, 상품 소개, 구독 상태 화면 구조 정리 |
| Phase 6 | `feature/user-payment-history` | 결제 내역 조회, 기간 필터, 페이지네이션, 구독 해지 UI/상태 |
| Phase 7 | `feature/user-billing` | checkout, order 생성, 결제 성공/실패, confirm 흐름 |
| Phase 8 | `feature/user-frontend-qa` | 누락 기능 보완, 예외 처리, 접근성, 반응형, 실제 API 연동 QA |

> 참고:
> - 기존 문서의 `feature/user-billing-base`와 Phase 9는 현재 프로젝트 순서에 맞지 않으므로 더 이상 사용하지 않는다.
> - 공통 타입/API 정리는 Phase 5~7 각 기능 구현에 포함해 진행한다.

## Current Implementation Snapshot

### 현재 존재하는 것

- [x] `/mypage/subscription`, `/mypage/payment-history`, `/billing/checkout`, `/billing/success`, `/billing/fail` 화면
- [x] static product 카드, mock subscription 상태, mock 결제 내역, checkout 동의 UI
- [x] 구독 해지 confirm modal과 success message 수준의 프론트 상호작용

### Phase 5에서 추가된 것 (PR #179)

- [x] `types/subscription.ts` — enum 5개 + interface 7개
- [x] `api/subscription/subscriptionApi.ts` — 상품/구독/사용량/권한 GET 4개 endpoint
- [x] `hooks/subscription/` — queryKeys + useProducts, useMySubscriptions, useUsages, useEntitlements
- [x] `utils/subscription/subscriptionView.ts` — 뷰 상수, formatBillingDate, buildUsageItems
- [x] `components/subscription/` — UsageStatusCard, RecommendationCard, UsageSectionSkeleton
- [x] SubscriptionPage mock 제거 및 실제 훅 연결

### 현재 부족한 것

- [ ] 실제 상품/구독/결제 contract 기반 데이터 흐름 (백엔드 API 미연동 상태)
- [ ] checkout order 생성 / payment confirm / cancel API 연동
- [ ] subscription entitlement 재조회
- [ ] success URL 직접 접근 방어와 서버 상태 우선 처리

---

## Technical Context

| 분류 | 선택 | 근거 |
|------|------|------|
| 라우팅 | `/mypage/*`, `/billing/*` | 구독 관리와 결제 플로우를 사용자 마이페이지/결제 도메인으로 분리 |
| 상품 진입 | URL query `?product=...` | 상품 CTA와 checkout 연결을 명확히 표현 |
| 서버 상태 | `TanStack Query` 예정 | 상품, 구독, 사용량, 결제 내역, 결제 상태 재조회 및 캐시 무효화 |
| 결제 연동 | Toss Payments + 백엔드 confirm | amount/order 검증과 중복 결제 방지는 백엔드가 최종 처리 |
| 세션 복원 | `orderId` 기반 상태 조회 | success/fail 새로고침 및 직접 접근 방어 |
| 스타일링 | 기존 Career Wave UI/CSS 컨벤션 | 현재 MVP UI를 유지하면서 실제 계약 기반으로 전환 |

### 전제 조건

- 상품 코드는 `document-coaching`, `interview`를 사용한다.
- checkout query는 진입 힌트일 뿐이며, 최종 상품명/가격/결제 주기는 서버 응답을 기준으로 한다.
- Member 도메인의 제재/블랙리스트/승인 대기 상태는 결제 요청을 차단할 수 있다.
- 현재 화면은 mock/static data에 의존하므로, 실제 API 연동 시 상태 소유 지점이 재정리되어야 한다.

---

## Project Structure

```txt
frontend/src/user/
├── pages/mypage/
│   ├── SubscriptionPage.tsx
│   └── PaymentHistoryPage.tsx
├── pages/billing/
│   ├── CheckoutPage.tsx
│   ├── PaymentSuccessPage.tsx
│   ├── PaymentFailPage.tsx
│   ├── PricingPage.tsx
│   ├── CompanyProductPage.tsx
│   └── billingProducts.ts
├── api/subscription/
│   └── subscriptionApi.ts       # Phase 5 구현 완료
├── components/subscription/
│   ├── UsageStatusCard.tsx      # Phase 5 구현 완료
│   ├── RecommendationCard.tsx   # Phase 5 구현 완료
│   └── UsageSectionSkeleton.tsx # Phase 5 구현 완료
├── hooks/subscription/
│   ├── index.ts
│   ├── queryKeys.ts             # Phase 5 구현 완료
│   ├── useProducts.ts           # Phase 5 구현 완료
│   ├── useMySubscriptions.ts    # Phase 5 구현 완료
│   ├── useUsages.ts             # Phase 5 구현 완료
│   └── useEntitlements.ts       # Phase 5 구현 완료
├── utils/subscription/
│   └── subscriptionView.ts      # Phase 5 구현 완료
└── types/subscription.ts        # Phase 5 구현 완료
```

---

## Data Flow

1. 사용자가 `/mypage/subscription`에서 상품 소개와 현재 구독 상태를 확인한다.
2. 구매 CTA는 `/billing/checkout?product=...`로 이동한다.
3. checkout은 query를 파싱하지만, 최종 상품 정보/가격/order는 서버 응답 기준으로 확정해야 한다.
4. success/fail 화면은 URL 파라미터만으로 최종 상태를 확정하지 않고, `orderId` 또는 confirm API 결과를 기준으로 렌더링해야 한다.
5. 구독 해지, 결제 내역, entitlement 반영은 query invalidation 또는 재조회 구조를 가져야 한다.

## Risks

- 현재 페이지는 mock/static UI 중심이라 "실제 완료"로 오해하기 쉽다.
- success/fail 페이지가 아직 서버 confirm 우선 구조가 아니므로 product query 기반 표시를 그대로 믿으면 안 된다.
- subscription/payment history/billing이 auth 상태와 엮이므로 Member 도메인과의 route guard/제재 상태 연동이 필요하다.

---

## Phase Breakdown

### Phase 5 — Subscription
- [ ] `types/subscription.ts` 도입 및 상품/구독/사용량 타입 정리
- [ ] `/mypage/subscription` 구독 없음/1개/2개 상태를 실제 contract 기준으로 정리
- [ ] 사용량 카드, empty state, recommendation card의 상태 소유 지점 정리
- [ ] 상품 CTA와 checkout query 매핑 정리

### Phase 6 — Payment History (PR #지정 예정, branch: feature/user-payment-history)
- [x] `billingApi.ts` 신설: `getPaymentHistory`
- [x] `subscriptionApi.ts`에 `cancelSubscription` 추가
- [x] `usePaymentHistory`, `useCancelSubscription`, `usePaymentHistoryStatus` 훅
- [x] `PaymentHistorySubscriptionCard`, `CancelSubscriptionModal`, `PaymentHistoryList` 컴포넌트
- [x] `SubscriptionHistorySection`, `PaymentHistorySection`, `BillingNoticeSection` 섹션 컴포넌트
- [x] 구독 없음/1개/2개 상태, `PAYMENT_FAILED` 경고, `CANCEL_SCHEDULED` 문구
- [x] 결제 내역 기간 필터·pagination 실데이터 기준 전환
- [x] 구독 해지 confirm modal ESC 키 + 포커스 처리
- [x] 해지 후 query invalidation (`mySubscriptions`, `usages`, `entitlements`)

### Phase 7 — Billing
- [ ] `/billing/checkout` product query 검증 및 서버 상품/order 정보 반영
- [ ] order 생성 요청, 중복 클릭 방지, 동의 상태 처리
- [ ] `/billing/success` confirm/loading/success 상태 구현
- [ ] `/billing/fail` 실패 사유별 메시지 및 재시도 CTA 구현
- [ ] success/fail 직접 접근 및 새로고침 상태 복원 처리

### Phase 8 — Frontend QA
- [ ] Member 제재/승인 상태와 checkout 차단 연동 검증
- [ ] 민감 결제 정보 비저장 검증
- [ ] modal focus / keyboard control / mobile 375px 검증
- [ ] mock/static 데이터를 실제 API 구조로 교체하며 남는 레거시 정리
- [ ] build / 실사용 시나리오 QA
