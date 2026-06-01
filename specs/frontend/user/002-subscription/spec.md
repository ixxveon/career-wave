# Feature Specification: User Subscription & Billing

> 작성일: 2026-05-31  
> 관련 문서: `plan.md` / `tasks.md` / `api-schema.md` / `constitution.md`  
> **Feature Branch**: `feature/user-subscription-billing`  
> **Status**: Draft

---

## 1. User Scenarios & Testing

### User Story 1 — AI 서비스 구독 현황 확인 (Priority: P1)
> 사용자는 마이페이지에서 현재 구독중인 AI 서비스와 사용량을 한눈에 확인하고 싶다.

**Acceptance Scenarios**:
1. **Given** 사용자가 `/mypage/subscription`에 진입하면, **Then** AI 서비스 소개, 서류 AI 코칭/AI 모의면접 카드, 구독 현황 영역이 표시된다.
2. **Given** 구독중인 상품이 없으면, **Then** empty state와 두 상품 구매 CTA가 표시된다.
3. **Given** 하나의 상품만 구독중이면, **Then** 구독중 상품 사용량 카드와 미구독 상품 추천 카드가 표시된다.
4. **Given** 두 상품 모두 구독중이면, **Then** 두 개의 사용량 카드가 동시에 표시된다.

### User Story 2 — 상품 선택 후 checkout 진입 (Priority: P1)
> 사용자는 원하는 AI 상품을 선택하고 결제 정보와 자동 결제 안내를 확인한 뒤 결제를 시작하고 싶다.

**Acceptance Scenarios**:
1. **Given** 사용자가 구매하기 버튼을 클릭하면, **Then** `/billing/checkout?product={productCode}`로 이동한다.
2. **Given** checkout 페이지에 유효한 product query가 있으면, **Then** 상품 정보와 결제 요약이 표시된다.
3. **Given** product query가 없거나 유효하지 않으면, **Then** 결제를 진행하지 않고 상품 선택 페이지로 돌아가는 안내를 표시한다.
4. **Given** 자동 결제 동의 체크박스를 선택하지 않으면, **When** 결제 버튼을 클릭할 때, **Then** 동의 필요 안내가 표시된다.

### User Story 3 — 결제 성공/실패 처리 (Priority: P1)
> 사용자는 결제 결과를 명확히 확인하고 다음 행동을 선택하고 싶다.

**Acceptance Scenarios**:
1. **Given** 결제가 성공 redirect로 돌아오면, **Then** 서버 승인/상태 조회를 완료한 뒤 성공 UI가 표시된다.
2. **Given** 결제 승인 확인 중이면, **Then** loading UI가 표시되고 중복 confirm 요청이 방지된다.
3. **Given** 결제가 실패하거나 사용자가 취소하면, **Then** 실패 사유와 다시 결제하기/AI 서비스로 돌아가기 CTA가 표시된다.
4. **Given** success URL에 직접 접근하면, **Then** 서버 결제 상태 확인 전까지 구독 성공으로 처리하지 않는다.

### User Story 4 — 결제 내역 및 구독 관리 (Priority: P1)
> 사용자는 내 구독 내역과 최근 결제 내역을 확인하고 필요 시 구독 해지를 신청하고 싶다.

**Acceptance Scenarios**:
1. **Given** 사용자가 `/mypage/payment-history`에 진입하면, **Then** 내 구독 내역과 최근 결제 내역 영역이 표시된다.
2. **Given** 구독이 없으면, **Then** empty state와 구독 알아보기 CTA가 표시된다.
3. **Given** 결제 내역이 있으면, **Then** 기간 필터, 결제 row, pagination이 표시된다.
4. **Given** 사용자가 구독 해지를 클릭하면, **Then** confirm modal이 표시되고 확인 후에만 해지 요청이 전송된다.
5. **Given** 해지 신청이 완료되면, **Then** `CANCEL_SCHEDULED` 상태와 다음 결제 해지 예정 문구가 표시된다.

### User Story 5 — 배포 환경 오류 복구 (Priority: P2)
> 사용자는 결제 중 네트워크 문제나 PG 오류가 발생해도 상태를 잃지 않고 안전하게 복구하고 싶다.

**Acceptance Scenarios**:
1. **Given** checkout order 생성 중 네트워크가 끊기면, **Then** 중복 결제를 만들지 않는 재시도 안내가 표시된다.
2. **Given** 결제 성공 redirect 이후 confirm API가 실패하면, **Then** 결제 확인 중 또는 고객센터 문의 안내가 표시되고 임의로 성공 처리하지 않는다.
3. **Given** 자동 결제 실패 상태가 조회되면, **Then** 결제수단 확인 CTA 또는 재결제 CTA가 표시된다.

---

## 2. Requirements

### Functional Requirements

- **FR-001**: `/mypage/subscription`은 AI 서비스 소개 banner, 상품 카드, 구독 현황, 이용 안내를 제공한다.
- **FR-002**: 상품 CTA는 `/billing/checkout?product=document-coaching` 또는 `/billing/checkout?product=interview`로 이동한다.
- **FR-003**: 구독 현황은 구독 없음, 1개 구독, 2개 구독 상태를 모두 지원한다.
- **FR-004**: 사용량 카드는 총 제공량, 사용량, 잔여량, 초과/소진 상태를 표시한다.
- **FR-005**: `/mypage/payment-history`는 내 구독 내역과 최근 결제 내역을 분리하여 표시한다.
- **FR-006**: 결제 내역은 기간 필터와 pagination을 지원한다.
- **FR-007**: 구독 해지는 confirm modal 확인 후 API 요청이 전송된다.
- **FR-008**: 해지 완료 후 `CANCEL_SCHEDULED` 또는 서버 응답 상태를 반영하고 구독 목록을 재조회한다.
- **FR-009**: `/billing/checkout`은 product query를 검증하고, 서버 상품 정보 또는 mock 상품 정보를 조회한다.
- **FR-010**: checkout은 정기 구독 badge, 결제 요약, 자동 결제 안내, 동의 체크박스를 제공한다.
- **FR-011**: 결제 버튼은 동의 완료 및 order 생성 가능 상태에서만 활성화된다.
- **FR-012**: `/billing/success`는 결제 승인/상태 조회 후 상품명, 금액, 결제일, 다음 결제 예정일, 결제 상태를 표시한다.
- **FR-013**: `/billing/fail`은 상품명, 금액, 실패 사유, 다시 결제하기, AI 서비스로 돌아가기 CTA를 제공한다.
- **FR-014**: 결제 실패 사유는 사용자 취소, 카드 승인 실패, timeout, 서버 confirm 실패, 알 수 없는 오류를 구분한다.
- **FR-015**: 제재/블랙리스트/승인 대기 회원은 결제 시도 전 제한 안내를 받을 수 있어야 한다.

### Non-functional Requirements

- **NFR-001**: 결제 민감정보는 브라우저 저장소와 로그에 저장하지 않는다.
- **NFR-002**: 결제 요청/해지 요청/confirm 요청은 중복 제출을 방지한다.
- **NFR-003**: 서버 상태와 local state가 불일치할 때 서버 재조회 결과를 우선한다.
- **NFR-004**: 모바일 375px 기준 상품 카드, checkout 요약, 결제 row가 겹치지 않아야 한다.
- **NFR-005**: 결제/해지 confirm modal은 키보드 접근성과 포커스 트랩을 지원한다.
- **NFR-006**: Lighthouse 접근성 95점 이상을 목표로 한다.

### Key Entities

- **Product**: `productCode`, `name`, `description`, `price`, `billingCycle`, `features`, `active`
- **Subscription**: `subscriptionId`, `memberId`, `productCode`, `status`, `startedAt`, `currentPeriodStart`, `currentPeriodEnd`, `nextBillingAt`, `cancelScheduledAt`
- **UsageSummary**: `productCode`, `limit`, `used`, `remaining`, `unit`, `resetAt`
- **PaymentOrder**: `orderId`, `productCode`, `amount`, `currency`, `status(PaymentStatus)`, `idempotencyKey`, `createdAt`
- **PaymentHistory**: `paymentId`, `orderId`, `productCode`, `amount`, `status(PaymentStatus)`, `paidAt`, `failedReason`
- **PaymentFailure**: `reasonCode`, `displayMessage`, `retryable`

> `PaymentOrder.status`와 `PaymentHistory.status`는 `api-schema.md`의 `PaymentStatus` enum을 사용하며, 결제 플로우 전이는 `constitution.md`의 "2.2 결제 플로우 상태"를 따른다.

---

## 3. Edge Cases 및 해결 정책

- **product query 누락/오류**: checkout 진행 차단, 상품 선택 CTA 표시.
- **가격 변조 시도**: 프론트 query/표시값은 무시하고 서버 order 생성 응답 기준으로 결제 진행.
- **중복 결제 클릭**: 요청 중 버튼 disabled, idempotency key 기반 재시도.
- **success URL 직접 접근**: 서버 상태 조회 전 성공 UI 표시 금지.
- **confirm 실패**: 결제 확인 중 안내 또는 실패 안내 표시. 구독 활성화는 서버 상태를 재조회한다.
- **사용자 결제 취소**: 실패 페이지에서 취소로 구분하고 다시 결제하기 CTA 제공.
- **자동 결제 실패**: 구독 상태 `PAYMENT_FAILED` 표시, 결제수단 확인 또는 재시도 CTA 제공.
- **해지 직후 새로고침**: 구독 목록 재조회로 `CANCEL_SCHEDULED` 상태 복원.
- **결제 내역 없음**: empty state와 구독 상품 안내 CTA 표시.
- **권한 없음/제재 회원**: 결제 요청 전 제한 안내 표시. 내부 제재 상세 사유는 노출하지 않는다.

---

## 4. Success Criteria

- **SC-001**: `/mypage/subscription`에서 구독 없음/1개/2개 상태가 모두 깨지지 않고 표시된다.
- **SC-002**: 모든 구매 CTA가 올바른 product query로 checkout에 진입한다.
- **SC-003**: checkout에서 동의 전 결제 진행이 차단된다.
- **SC-004**: success 화면은 서버 confirm 또는 payment status 조회 후에만 최종 성공을 표시한다.
- **SC-005**: 구독 해지 후 상태가 `CANCEL_SCHEDULED`로 반영되고 결제 내역/구독 목록이 재조회된다.
- **SC-006**: 결제 실패, 취소, timeout, 네트워크 실패가 서로 구분된 사용자 안내로 표시된다.
- **SC-007**: 결제 민감정보가 브라우저 저장소와 console에 남지 않는다.

---

## 5. Assumptions

- 실제 상품 가격, 할인, 다음 결제일, 구독 권한은 백엔드 응답을 기준으로 한다.
- 현재 ERD 초안에는 결제/구독 모델이 부족하므로 backend spec에서 별도 설계가 필요하다.
- Toss Payments 실제 연동 전까지 mock success/fail flow는 개발 환경에서만 허용한다.
- 결제 성공 후 AI 서비스 권한 반영은 구독 API 재조회 또는 entitlement API 응답으로 확인한다.
- 환불 정책과 자동 결제 해지 시점은 서비스 정책 확정 후 문구와 상태를 보완한다.
