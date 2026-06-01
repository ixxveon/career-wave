# Checklist: User Subscription & Billing

> 작성자: 마은재 | 작성일: 2026-05-31  
> 구현 완료 후 PR 올리기 전에 본인이 직접 체크합니다.  
> PR 제목 형식: `[SUBSCRIPTION] 사용자 구독 및 결제 플로우 구현`

---

## Phase 1 — 상태 관리 & 데이터 연동

### 상태 설계

- [ ] `api-schema.md`의 product/subscription/payment enum과 실제 프론트 타입이 일치하는가?
- [ ] 구독 상태 `NONE`, `ACTIVE`, `CANCEL_SCHEDULED`, `EXPIRED`, `PAYMENT_FAILED`가 모두 UI에서 처리되는가?
- [ ] 결제 상태 `READY`, `AGREED`, `REQUESTING`, `REDIRECTING`, `CONFIRMING`, `PAID`, `FAILED`, `CANCELED`, `REFUNDED`가 모두 처리되는가?
- [ ] ERD 초안에 없는 결제/구독 모델이 backend 계약 필요 항목으로 정리되었는가?
- [ ] mock 데이터와 실제 API 응답 매핑이 분리되어 있는가?

### 데이터 연동

- [ ] 상품/구독/사용량/결제 내역이 TanStack Query 또는 동등한 서버 상태 관리로 조회되는가?
- [ ] 결제 성공 후 subscription/entitlement API를 재조회하여 권한이 반영되는가?
- [ ] 구독 해지 후 구독 목록과 결제 내역 query가 무효화되어 최신 상태로 갱신되는가?
- [ ] success/fail 새로고침 시 `orderId` 기반 상태 조회로 화면이 복원되는가?

### 에러 핸들링

- [ ] API 호출 실패 시 `statusCode`와 `reasonCode`에 따른 메시지가 정상 노출되는가?
- [ ] 네트워크 단절 중 order 생성/confirm 실패 시 중복 결제 없이 재시도 가능한 안내가 표시되는가?
- [ ] PG timeout 또는 confirm 500 상태에서 임의로 성공 처리하지 않는가?

## Phase 2 — 기능 구현 (P1: 핵심 사용자 플로우)

> P1: 구독 현황, checkout, success/fail, 결제 내역의 핵심 플로우. 이 항목들이 동작하지 않으면 기능 자체가 불가.

### 마이페이지 구독 현황

- [ ] `/mypage/subscription` 상단 AI 서비스 소개와 CTA가 표시되는가?
- [ ] 서류 AI 코칭 구매 CTA가 `/billing/checkout?product=document-coaching`으로 이동하는가?
- [ ] AI 모의면접 구매 CTA가 `/billing/checkout?product=interview`로 이동하는가?
- [ ] 구독 없음 상태에서 empty state와 2개 CTA가 표시되는가?
- [ ] 상품 1개 구독 상태에서 사용량 카드와 미구독 상품 추천 카드가 표시되는가?
- [ ] 상품 2개 구독 상태에서 두 사용량 카드가 동시에 표시되는가?
- [ ] 사용량 0, 한도 초과, resetAt 없음 상태에서 UI가 깨지지 않는가?

### 결제 내역 및 구독 해지

- [ ] `/mypage/payment-history`에서 구독 없음/1개/2개 상태가 모두 표시되는가?
- [ ] 결제 내역 없음 empty state가 표시되는가?
- [ ] 결제 내역 있음 상태에서 기간 필터와 pagination이 동작하는가?
- [ ] 구독 해지 버튼 클릭 시 confirm modal이 먼저 표시되는가?
- [ ] confirm 전에는 해지 API가 호출되지 않는가?
- [ ] 해지 신청 완료 후 `CANCEL_SCHEDULED` 상태와 다음 결제 해지 예정 문구가 표시되는가?
- [ ] 해지 후 구독 목록과 결제 내역이 재조회되는가?

### Checkout

- [ ] product query 누락/오류 시 결제 진행이 차단되는가?
- [ ] checkout 상품 정보가 query 하드코딩이 아니라 서버 상품 정보 또는 명확히 분리된 mock에서 오는가?
- [ ] 자동 결제 동의 체크 전 결제 버튼 클릭 시 안내가 표시되는가?
- [ ] order 생성 요청 중 결제 버튼이 disabled 되어 중복 요청이 방지되는가?
- [ ] 가격/상품 정보는 서버 order 생성 응답 기준으로 결제에 사용되는가?
- [ ] 제재/블랙리스트/승인 대기 회원의 결제 제한 응답이 안내 UI로 표시되는가?

### Success/Fail 및 Toss 연동

- [ ] success 페이지가 URL 직접 접근만으로 성공 UI를 표시하지 않는가?
- [ ] success 페이지에서 confirm API 또는 결제 상태 조회를 완료한 뒤 성공 UI를 표시하는가?
- [ ] confirm 중 loading UI가 표시되고 중복 confirm 요청이 방지되는가?
- [ ] fail 페이지에서 사용자 취소와 결제 실패가 구분되어 표시되는가?
- [ ] 다시 결제하기 CTA가 기존 productCode를 유지하여 checkout으로 이동하는가?
- [ ] PG raw error, billing key, payment key가 화면이나 로그에 노출되지 않는가?

## Phase 3 — 연동 계약 (P2: 인접 도메인 연결)

> P2: 단독 화면은 동작하지만, AI 서비스 권한/회원 상태/PG 연동과 연결되는 항목.

### AI 서비스 권한 연결

- [ ] `document-coaching` entitlement가 서류 AI 코칭 진입 가능 여부에 반영되는가?
- [ ] `interview` entitlement가 AI 모의면접 진입 가능 여부에 반영되는가?
- [ ] 사용량 소진 상태에서 각 AI 서비스가 적절한 안내 또는 업그레이드 CTA를 표시하는가?

### Member/Payment 도메인 연결

- [ ] 제재/블랙리스트/승인 대기 회원이 checkout 진입 또는 order 생성 시 차단되는가?
- [ ] Toss success/fail redirect 파라미터가 백엔드 payment API 계약과 일치하는가?
- [ ] 환불/해지 정책 문구가 backend/payment 정책과 불일치하지 않는가?

## 보안

- [ ] paymentKey, billingKey, 카드정보, order 민감값이 localStorage/sessionStorage에 저장되지 않는가?
- [ ] 결제/해지 API 호출이 View가 아닌 `api/` 또는 `hooks/`로 분리되어 있는가?
- [ ] query string 가격값을 신뢰하는 코드가 없는가?
- [ ] 구독 권한을 local state만으로 부여하지 않는가?
- [ ] mock 결제 flow가 production 환경에서 비활성화되는가?

## 접근성 및 반응형

- [ ] checkout 동의 체크박스와 결제 버튼이 키보드로 조작 가능한가?
- [ ] 해지 confirm modal이 포커스 트랩과 ESC/닫기 처리를 지원하는가?
- [ ] 모바일 375px에서 상품 카드, 결제 요약, 결제 내역 row가 겹치지 않는가?
- [ ] 결제 실패/성공 메시지가 스크린리더에 전달 가능한 구조인가?
- [ ] 결제 진행 중 loading 상태가 시각적/접근성 측면에서 명확한가?

## 배포 전 최종 확인

- [ ] mock 데이터 제거 또는 개발 환경 전용 분리 확인
- [ ] console/debug 코드 제거
- [ ] 순차 의존 피처인 경우 PR 본문에 의존 브랜치와 선행 PR을 명시했는가?
- [ ] 빌드 통과
- [ ] Lighthouse 접근성 95점 이상 목표 확인
- [ ] `tasks.md` 모든 항목 완료 체크
