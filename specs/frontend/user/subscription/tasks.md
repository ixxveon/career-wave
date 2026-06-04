# Tasks: User Subscription & Billing

> `plan.md`의 Project Phase Alignment를 따른다.  
> 각 항목은 하나의 커밋 또는 하나의 PR 리뷰 단위로 쪼갤 수 있어야 한다.

> 프로젝트 순서:
> `feature/user-subscription` → `feature/user-payment-history` → `feature/user-billing` → `feature/user-frontend-qa`

---

## Phase 5 — Subscription

- [ ] `types/subscription.ts` 타입 정의: `ProductCode`, `SubscriptionStatus`, `UsageSummary`, `PaymentStatus` 등
- [ ] ERD 초안에서 누락된 결제/구독 테이블 요구사항 정리
- [ ] 상품 목록/상세 API 응답 타입 정의
- [ ] `/mypage/subscription` 상단 AI 서비스 소개와 CTA 상태 정리
- [ ] 구독 없음 empty state와 2개 CTA 구현/정리
- [ ] 단일 구독 상태: 구독중 상품 사용량 카드 + 다른 상품 추천 카드 구조 정리
- [ ] 2개 구독 상태: 2개 사용량 카드 동시 표시 구조 정리
- [ ] 사용량 progress/remaining UI에서 한도 초과/데이터 없음 상태 처리

## Phase 6 — Payment History

- [ ] `/mypage/payment-history` 내 구독 내역 영역을 contract 기준으로 정리
- [ ] 구독 없음 상태 CTA와 recommendation card 정리
- [ ] 구독 해지 버튼 및 confirm modal 구현 정리
- [ ] 해지 신청 완료 후 `CANCEL_SCHEDULED` 상태, 자동 결제 해지 예정 문구, success message 처리
- [ ] 최근 결제 내역 empty state 구현 정리
- [ ] 결제 내역 있음 상태: 기간 필터, compact row, pagination을 실제 데이터 구조 기준으로 전환
- [ ] 결제내역 유의사항 하단 안내 박스 유지 여부 정리

## Phase 7 — Billing

- [ ] `/billing/checkout`에서 `product` query 파싱 및 유효성 검증 구현
- [ ] 잘못된 product query 또는 누락 시 fallback/error state 구현
- [ ] checkout 진입 시 서버 상품 정보 조회 또는 명확한 mock adapter 구현
- [ ] 상품 정보 카드, 결제 요약 카드, 정기 구독 badge, 자동 결제 안내 문구 정리
- [ ] 결제 동의 체크박스 및 미동의 클릭 안내 구현
- [ ] 동의 후 order 생성 요청, 요청 중 중복 클릭 방지 구현
- [ ] `/billing/success`에서 결제 승인/상태 조회 후 완료 UI 표시
- [ ] `/billing/fail`에서 실패 사유, 다시 결제하기, AI 서비스로 돌아가기 CTA 구현
- [ ] success/fail URL 직접 접근 방어 및 상태 복원 처리

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
