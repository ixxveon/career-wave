# Checklist: User Subscription & Billing

> 구현 완료 후 PR 올리기 전에 본인이 직접 체크한다.
> 현재 프로젝트 순서:
> `Phase 5 Subscription → Phase 6 Payment History → Phase 7 Billing → Phase 8 Frontend QA`
> 표기 기준: `[x]` 구현/확인 완료, `[-]` 부분 구현 또는 추가 검증 필요, `[ ]` 미구현 또는 미확인

---

## 현재 상태 메모

- Phase 5 완료: `types/subscription.ts`, `api/subscription/`, `hooks/subscription/`, `utils/subscription/subscriptionView.ts`, `components/subscription/` 신설 및 SubscriptionPage 훅 연결 (PR #179)
- Phase 6~8은 미구현 상태이며 "실제 구현 완료 기준을 만족하는가"를 기준으로 체크한다.

## Phase 5 — Subscription

### 상태 설계

- [x] `api-schema.md`의 product/subscription/payment enum과 실제 프론트 타입이 일치하는가?
- [-] 구독 상태 `NONE`, `ACTIVE`, `CANCEL_SCHEDULED`, `EXPIRED`, `PAYMENT_FAILED`가 모두 UI에서 처리되는가? (타입은 정의됨, UI 분기는 ACTIVE/CANCEL_SCHEDULED/PAYMENT_FAILED 기준 isSubscribed 처리 중. EXPIRED 별도 UI는 Phase 6에서 보완)
- [ ] ERD 초안에 없는 결제/구독 모델이 backend 계약 필요 항목으로 정리되었는가?
- [x] mock 데이터와 실제 API 응답 매핑이 분리되어 있는가? (SubscriptionPage mock 제거, hooks/subscription/으로 분리 완료)

### 구독 현황 화면

- [x] `/mypage/subscription` 상단 AI 서비스 소개와 CTA가 표시되는가?
- [x] 서류 AI 코칭 구매 CTA가 `/billing/checkout?product=document-coaching`으로 이동하는가?
- [x] AI 모의면접 구매 CTA가 `/billing/checkout?product=interview`로 이동하는가?
- [x] 구독 없음 상태에서 empty state와 2개 CTA가 표시되는가?
- [x] 상품 1개 구독 상태에서 사용량 카드와 미구독 상품 추천 카드가 표시되는가?
- [x] 상품 2개 구독 상태에서 두 사용량 카드가 동시에 표시되는가?
- [x] 사용량 0, 한도 초과, resetAt 없음 상태에서 UI가 깨지지 않는가?

## Phase 6 — Payment History

- [x] `/mypage/payment-history`에서 구독 카드, 결제 내역, 하단 안내가 표시되는가?
- [x] 결제 내역 없음 empty state가 표시되는가?
- [x] 결제 내역 있음 상태에서 기간 필터와 pagination이 실제 데이터 기준으로 동작하는가?
- [x] 구독 해지 버튼 클릭 시 confirm modal이 먼저 표시되는가?
- [x] confirm 전에는 해지 API가 호출되지 않는가?
- [x] 해지 신청 완료 후 `CANCEL_SCHEDULED` 상태와 다음 결제 해지 예정 문구가 표시되는가?
- [x] 해지 후 구독 목록과 결제 내역이 재조회되는가?

## Phase 7 — Billing

### Checkout

- [-] product query 누락/오류 시 결제 진행이 차단되는가?
- [ ] checkout 상품 정보가 query 하드코딩이 아니라 서버 상품 정보 또는 명확히 분리된 mock adapter에서 오는가?
- [-] 자동 결제 동의 체크 전 결제 버튼 클릭 시 안내가 표시되는가?
- [ ] order 생성 요청 중 결제 버튼이 disabled 되어 중복 요청이 방지되는가?
- [ ] 가격/상품 정보는 서버 order 생성 응답 기준으로 결제에 사용되는가?
- [ ] 제재/블랙리스트/승인 대기 회원의 결제 제한 응답이 안내 UI로 표시되는가?

### Success / Fail

- [ ] success 페이지가 URL 직접 접근만으로 성공 UI를 표시하지 않는가?
- [ ] success 페이지에서 confirm API 또는 결제 상태 조회를 완료한 뒤 성공 UI를 표시하는가?
- [ ] confirm 중 loading UI가 표시되고 중복 confirm 요청이 방지되는가?
- [-] fail 페이지에서 다시 결제하기 CTA와 AI 서비스 복귀 CTA가 표시되는가?
- [ ] 사용자 취소와 결제 실패가 구분되어 표시되는가?
- [ ] PG raw error, billing key, payment key가 화면이나 로그에 노출되지 않는가?

## Phase 8 — Frontend QA

### 인접 도메인 / 연동 계약

- [ ] 결제 성공 후 subscription/entitlement API를 재조회하여 권한이 반영되는가?
- [ ] 구독 해지 후 구독 목록과 결제 내역 query가 무효화되어 최신 상태로 갱신되는가?
- [ ] success/fail 새로고침 시 `orderId` 기반 상태 조회로 화면이 복원되는가?
- [ ] Toss success/fail redirect 파라미터가 backend payment API 계약과 일치하는가?
- [ ] Member 제재/블랙리스트/승인 대기 상태와 checkout 차단이 연결되는가?

### 보안 / 접근성 / 반응형

- [ ] paymentKey, billingKey, 카드정보, order 민감값이 localStorage/sessionStorage에 저장되지 않는가?
- [ ] 결제/해지 API 호출이 View가 아닌 `api/` 또는 `hooks/`로 분리되어 있는가?
- [ ] query string 가격값을 신뢰하는 코드가 없는가?
- [ ] checkout 동의 체크박스와 결제 버튼이 키보드로 조작 가능한가?
- [ ] 해지 confirm modal이 포커스 트랩과 ESC/닫기 처리를 지원하는가?
- [ ] 모바일 375px에서 상품 카드, 결제 요약, 결제 내역 row가 겹치지 않는가?
- [ ] 결제 실패/성공 메시지가 스크린리더에 전달 가능한 구조인가?
- [ ] mock 데이터 제거 또는 개발 환경 전용 분리 확인
- [ ] console/debug 코드 제거
- [ ] 빌드 통과
- [ ] Lighthouse 접근성 95점 이상 목표 확인
- [ ] `tasks.md` 모든 항목 완료 체크
