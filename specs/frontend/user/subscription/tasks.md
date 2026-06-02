# Tasks: User Subscription

> `plan.md`의 Phase와 1:1 대응한다.  
> 각 항목은 하나의 커밋 또는 PR 리뷰 단위로 쪼갤 수 있어야 한다.

> PR 업로드는 팀 작업 지시의 `feature/user-billing-base` → `feature/user-subscription` → `feature/user-payment-history` → `feature/user-billing` → `feature/user-frontend-qa` 순서를 따른다.

---

## Phase 1 — 상품/구독/결제 타입 및 API 계약 정의

- [ ] `subscription.ts` 타입 정의: `ProductCode`, `SubscriptionStatus`, `PaymentStatus(READY/AGREED/REQUESTING/REDIRECTING/CONFIRMING/PAID/FAILED/CANCELED/REFUNDED)`, `PaymentFailureReason`, `UsageMetric`
- [ ] ERD 초안에서 누락된 결제/구독 테이블 요구사항 정리
- [ ] 상품 목록/상세 API 응답 타입 정의
- [ ] 내 구독 목록, 사용량, 결제 내역, checkout order 생성, 결제 confirm, 구독 해지 API 타입 정의
- [ ] 결제 error code 매핑 정의: 사용자 취소, 카드 승인 실패, timeout, 중복 주문, 권한 없음
- [ ] mock 데이터와 실제 API 응답 매핑표 작성

## Phase 2 — 마이페이지 구독 현황

- [ ] `/mypage/subscription` 상단 AI 서비스 소개 banner/hero 구현
- [ ] 서류 AI 코칭, AI 모의면접 서비스 소개 카드 구현
- [ ] 구매하기 CTA가 `/billing/checkout?product=document-coaching` 또는 `?product=interview`로 이동하는지 확인
- [ ] 구독 없음 empty state와 2개 CTA 구현
- [ ] 단일 구독 상태: 구독중 상품 사용량 카드 + 다른 상품 추천 카드 구현
- [ ] 2개 구독 상태: 2개 사용량 카드 동시 표시 구현
- [ ] 사용량 progress/remaining UI에서 한도 초과/데이터 없음 상태 처리
- [ ] AI 서비스 이용 안내, 환불/문의 안내 정적 영역 구현

## Phase 3 — 결제 내역 및 구독 해지

- [ ] `/mypage/payment-history` 내 구독 내역 영역 구현
- [ ] 구독 없음 상태에서 `/mypage/subscription`으로 이동하는 CTA 구현
- [ ] 구독 1개 상태: active subscription card + recommendation card 구현
- [ ] 구독 2개 상태: subscription card 2개 표시 구현
- [ ] 구독 해지 버튼 및 confirm modal 구현
- [ ] 해지 신청 완료 후 `CANCEL_SCHEDULED` 상태, 자동 결제 해지 예정 문구, success message 표시
- [ ] 최근 결제 내역 empty state 구현
- [ ] 결제 내역 있음 상태: 기간 필터, compact row, pagination 구현
- [ ] 결제내역 유의사항 하단 안내 박스 구현

## Phase 4 — checkout/success/fail

- [ ] `/billing/checkout`에서 `product` query 파싱 및 유효성 검증 구현
- [ ] 잘못된 product query 또는 누락 시 fallback/error state 구현
- [ ] checkout 진입 시 서버 상품 정보 조회 또는 mock 상품 매핑 구현
- [ ] 상품 정보 카드, 결제 요약 카드, 정기 구독 badge, 자동 결제 안내 문구 구현
- [ ] 결제 동의 체크박스 및 미동의 클릭 안내 구현
- [ ] 동의 후 order 생성 요청, 요청 중 중복 클릭 방지 구현
- [ ] mock 환경에서 success/fail 이동 분기 구현
- [ ] `/billing/success`에서 결제 승인/상태 조회 후 완료 UI 표시
- [ ] `/billing/fail`에서 실패 사유, 다시 결제하기, AI 서비스로 돌아가기 CTA 구현

## Phase 5 — Toss Payments 연동 준비

- [ ] Toss success redirect 파라미터 `paymentKey`, `orderId`, `amount` 처리 계약 정리
- [ ] confirm API 호출 전 amount 검증은 백엔드가 최종 수행하도록 연동 흐름 정리
- [ ] orderId/idempotency key 기반 중복 결제 방지 UI 구현
- [ ] 사용자 취소와 결제 실패를 구분하는 fail page 메시지 매핑
- [ ] success 페이지 새로고침 시 결제 상태 재조회 로직 구현
- [ ] 결제 pending/confirming 상태에서 skeleton/loading UI 구현

## Phase 6 — 보안/접근성/반응형 QA

- [ ] 결제 민감정보가 localStorage/sessionStorage/console에 남지 않는지 확인
- [ ] success URL 직접 접근 시 서버 상태 확인 전 성공 UI가 노출되지 않는지 확인
- [ ] 해지 confirm modal 포커스 이동 및 키보드 조작 확인
- [ ] 모바일 375px 기준 상품 카드, checkout 요약, payment row가 깨지지 않는지 확인
- [ ] 네트워크 단절/서버 오류/429/500 상태에서 재시도 UX 확인
- [ ] mock 결제 flow가 production 환경에 포함되지 않는지 확인
- [ ] `checklist.md` 기반 최종 점검 및 build 통과 확인
