# Implementation Plan: User Subscription

> 작성자: 마은재 | 작성일: 2026-05-31  
> 관련 문서: `constitution.md` / `tasks.md` / `spec.md` / `api-schema.md` / `checklist.md`  
> 레이어: **Frontend Only / Backend Ready**

---

## Summary

사용자 마이페이지의 구독 현황, AI 서비스 사용량, 결제 내역, 구독 해지, checkout/success/fail 결제 플로우를 구현하고 Toss Payments 및 백엔드 결제 API와 연결 가능한 계약을 정의한다.

---

## Technical Context

| 분류 | 선택 | 근거 |
|------|------|------|
| 라우팅 | `/mypage/*`, `/billing/*` | 구독 관리와 결제 플로우를 사용자 마이페이지/결제 도메인으로 분리 |
| 상품 진입 | URL query `?product=...` | 상품 CTA와 checkout 연결을 명확히 표현 |
| 서버 상태 | `TanStack Query` | 상품, 구독, 사용량, 결제 내역, 결제 상태 재조회 및 캐시 무효화 |
| 결제 연동 | Toss Payments + 백엔드 confirm | amount/order 검증과 중복 결제 방지는 백엔드에서 최종 처리 |
| 세션 복원 | `orderId` 기반 상태 조회 | success/fail 새로고침 및 직접 접근 방어 |
| 스타일링 | 기존 Career Wave UI/CSS 컨벤션 | 기존 마이페이지 톤 유지 |
| 보안 저장소 | 브라우저 저장소 비사용 | paymentKey, billingKey, 카드 정보 노출 방지 |

### 전제 조건

- 상품 코드: `document-coaching`, `interview`
- checkout은 query로 진입하지만, 최종 상품명/가격/결제 주기는 백엔드 상품 또는 order 응답을 기준으로 한다.
- Toss Payments success redirect 후 `paymentKey`, `orderId`, `amount`는 백엔드 confirm API로 전달한다.
- 결제 성공 후 구독 권한은 subscription/entitlement API 재조회로 확인한다.
- Member 도메인의 제재/블랙리스트/기업 승인 대기 상태는 결제 요청을 차단할 수 있다.
- ERD 초안에는 결제/구독 관련 테이블이 부족하므로 backend spec에서 `products`, `subscriptions`, `payments`, `payment_orders`, `subscription_usages` 계열 모델 재설계가 필요하다.

### Phase 0 선행 조건

- Backend spec에서 `products`, `subscriptions`, `payments`, `payment_orders`, `subscription_usages` 모델과 관계를 확정해야 한다.
- 위 ERD 재설계는 실제 API 연동 전 blocking dependency다.
- 단, frontend mock 구현은 `api-schema.md`의 계약을 기준으로 독립 진행할 수 있다.
- Phase 0 완료 전까지 checkout/결제/구독 상태는 mock adapter를 사용하고, 실제 PG confirm 및 entitlement 부여는 연결하지 않는다.

---

## Project Structure

```txt
src/user/
├── pages/mypage/
│   ├── SubscriptionPage.jsx
│   └── PaymentHistoryPage.jsx
├── pages/billing/
│   ├── CheckoutPage.jsx
│   ├── BillingSuccessPage.jsx
│   └── BillingFailPage.jsx
├── api/subscription/
│   ├── productApi.ts
│   ├── subscriptionApi.ts
│   ├── paymentApi.ts
│   └── checkoutApi.ts
├── hooks/subscription/
│   ├── useProducts.ts
│   ├── useMySubscriptions.ts
│   ├── useUsageSummary.ts
│   ├── usePaymentHistory.ts
│   ├── useCheckout.ts
│   └── useCancelSubscription.ts
└── types/
    └── subscription.ts
```

---

## Phases

### Phase 1: 인프라 세팅 & 타입 정의
- [ ] `subscription.ts` — 상품, 구독, 사용량, 결제 상태, 실패 사유 타입 정의
- [ ] `api/subscription/` — 상품/구독/사용량/결제/해지 API 함수 인터페이스 작성
- [ ] TanStack Query queryKey 컨벤션 정의 (`products`, `mySubscriptions`, `usageSummary`, `paymentHistory`, `paymentStatus`)
- [ ] 결제 상태별 공통 에러 매핑 작성 (`400`, `403`, `409`, `422`, `500`)
- [ ] mock 결제와 실제 Toss 결제 분리 구조 설계

### Phase 2: 마이페이지 구독 현황
- [ ] `/mypage/subscription` 서비스 소개 및 상품 카드 구현
- [ ] 구독 없음/1개/2개 상태별 UI 구현
- [ ] 사용량 카드 구현: limit, used, remaining, resetAt, 초과/소진 상태
- [ ] 상품 CTA에서 checkout query 전달 확인
- [ ] AI 서비스 이용 안내/환불/문의 정적 영역 구현

### Phase 3: 결제 내역 및 구독 해지
- [ ] `/mypage/payment-history` 구독 내역 및 결제 내역 구현
- [ ] 결제 내역 최신순 pagination 및 기간 필터 구현
- [ ] 구독 해지 confirm modal 및 cancel API 연동
- [ ] 해지 후 `CANCEL_SCHEDULED` 상태 반영과 query invalidation 구현
- [ ] payment empty state 및 recommendation card 구현

### Phase 4: Checkout / Success / Fail
- [ ] `/billing/checkout` product query 파싱 및 서버 상품 조회
- [ ] 자동 결제 동의, 결제 요약, order 생성 요청 구현
- [ ] `/billing/success` confirm/loading/success 상태 구현
- [ ] `/billing/fail` 실패 사유별 메시지 및 재시도 CTA 구현
- [ ] success/fail 직접 접근 및 새로고침 상태 복원 처리

### Phase 5: Toss Payments 연동 및 도메인 통합
- [ ] Toss SDK/redirect 파라미터 처리
- [ ] confirm API amount/order 검증 흐름 정렬
- [ ] subscription entitlement 재조회 및 AI 서비스 권한 반영
- [ ] Member 제재/블랙리스트 결제 제한 응답 처리
- [ ] 결제 실패/취소/timeout reasonCode 매핑

### Phase 6: Polish & QA
- [ ] `checklist.md` 전 항목 셀프 체크
- [ ] a11y — checkout 동의, 결제 상태, 해지 modal, 키보드 제어 검증
- [ ] 보안 검증 — success URL 위조, query 가격 조작, 민감정보 저장 여부 확인
- [ ] 반응형 검증 — 모바일 375px checkout/payment row 표시 확인
- [ ] 최종 확인 — mock 결제 제거, console 제거, build 통과
