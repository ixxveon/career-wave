# Constitution: User Subscription 도메인

> 작성자: 마은재 | 작성일: 2026-05-31  
> 관련 문서: `plan.md` / `tasks.md` / `spec.md` / `api-schema.md` / `checklist.md`  
> 레이어: **Frontend Only / Backend Ready**

---

## 0. 컨벤션

* **Feature Branch**: `feature/user-subscription-{기능명}` (예: `feature/user-subscription-billing`)
* **PR 제목 예시**: `[SUBSCRIPTION] 사용자 구독 및 결제 플로우 구현`
* **파일 경로 원칙**:
  * 페이지: `src/user/pages/mypage/`, `src/user/pages/billing/`
  * API 호출: `src/user/api/subscription/`
  * 상태/사이드이펙트 훅: `src/user/hooks/subscription/`
  * 타입: `src/user/types/subscription.ts`
* **문서 범위**: 마이페이지 구독 현황, AI 서비스 사용량, 결제 내역, 구독 해지, checkout/success/fail, 상품 선택, Toss Payments 연동 예정 계약을 포함한다.

### 예외: 순차 의존 피처

* Phase N+1이 Phase N의 코드를 필요로 하는 경우, Phase N 브랜치에서 분기하여 작업할 수 있다.
* 단, 머지 순서는 반드시 Phase N -> Phase N+1 순서를 지킨다.
* PR 본문에는 의존 브랜치와 선행 PR을 명시한다.
* 선행 Phase가 머지되기 전에는 후행 Phase PR을 merge하지 않는다.

---

## 1. 도메인 원칙

* **구독 상태의 단일 출처**: 구독 여부, 사용량, 결제 상태, 해지 예약 상태는 백엔드 응답을 기준으로 한다. URL query나 프론트 mock만으로 유료 권한을 부여하지 않는다.
* **결제 금액 신뢰 경계**: checkout 화면의 상품명/가격은 사용자 경험용 표시이며, 최종 결제 금액과 상품 권한은 서버가 생성한 order/checkout session 기준으로 확정한다.
* **중복 결제 방지**: 결제 요청은 orderId/idempotency key를 기준으로 처리되어야 하며, 프론트는 버튼 중복 클릭과 새로고침 재시도를 안전하게 처리한다.
* **명확한 해지 UX**: 구독 해지는 즉시 권한 박탈인지, 다음 결제일 전까지 유지인지 명확히 표시한다.
* **민감 결제정보 비저장**: 카드번호, 인증값, billing key, payment key 등 결제 민감정보는 브라우저 저장소에 저장하지 않는다.
* **실패 복구 가능성**: 결제 실패, 사용자 취소, PG timeout, 네트워크 단절, success redirect 후 confirm 실패를 구분하여 복구 CTA를 제공한다.

---

## 2. 상태 머신

### 2.1 구독 상태

```
NONE -> ACTIVE -> CANCEL_SCHEDULED -> EXPIRED
              -> PAYMENT_FAILED
PAYMENT_FAILED -> ACTIVE
ACTIVE -> REFUND_PENDING -> REFUNDED
```

| 상태 | UI 의미 |
|------|---------|
| `NONE` | 구독 없음, 상품 추천 및 구매 CTA |
| `ACTIVE` | 구독중, 사용량 카드 및 다음 결제일 표시 |
| `CANCEL_SCHEDULED` | 해지 예약됨, 남은 이용 기간 표시 |
| `EXPIRED` | 만료됨, 재구독 CTA |
| `PAYMENT_FAILED` | 자동 결제 실패, 결제수단 확인 CTA |
| `REFUND_PENDING` | 환불 처리 중 |
| `REFUNDED` | 환불 완료 |

### 2.2 결제 플로우 상태

```
READY -> AGREED -> REQUESTING -> REDIRECTING -> CONFIRMING -> SUCCESS
                                                  -> FAIL
READY -> FAIL
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| READY -> AGREED | 허용 | 결제 약관/자동결제 동의 |
| AGREED -> REQUESTING | 허용 | 서버 checkout/order 생성 요청 |
| REQUESTING -> REDIRECTING | 허용 | PG 결제창 또는 mock success 이동 |
| REDIRECTING -> CONFIRMING | 허용 | success redirect 후 결제 승인 확인 |
| CONFIRMING -> SUCCESS | 허용 | 서버 결제 승인 및 구독 활성화 완료 |
| ANY -> FAIL | 허용 | 사용자 취소, PG 실패, 서버 승인 실패, 네트워크 오류 |

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 상품 식별 | 진입 query는 `?product=document-coaching` 또는 `?product=interview` 사용 | 현재 route와 CTA 연결 명확화 |
| 상품 최종 정보 | checkout 진입 후 서버 상품 조회 응답을 기준으로 표시 | query 조작으로 가격/상품 변조 방지 |
| 서버 상태 관리 | 상품, 구독, 사용량, 결제 내역은 TanStack Query로 관리 | 캐시, 재조회, 로딩/에러 처리 일관성 |
| 결제 요청 | checkout session/order 생성 API를 거쳐 PG 연동 | idempotency, 금액 검증, 중복 결제 방지 |
| success 화면 | URL만으로 성공 처리 금지, 서버 confirm 결과 또는 payment status 조회 필요 | 위조 success URL 방지 |
| 해지 처리 | confirm modal 후 cancel API 호출, 결과 상태 재조회 | 실수 해지 방지 및 서버 상태 일관성 |
| mock 분리 | mock success/fail은 개발 모드에서만 허용 | 실제 배포 결제와 혼동 방지 |

---

## 4. 불변 규칙 (Invariants)

* checkout은 반드시 `product` query 또는 서버 발급 checkout session으로 상품을 식별한다.
* 프론트에서 가격, 할인, 다음 결제일을 임의 계산하여 최종값처럼 저장하지 않는다.
* 결제 성공 화면은 서버 승인 또는 상태 조회가 완료되기 전까지 최종 성공으로 표시하지 않는다.
* 구독 권한은 `subscriptionStatus`와 `entitlements` 응답을 기준으로 판단한다.
* 구독 해지는 confirm modal 없이는 요청할 수 없다.
* 결제 실패 사유는 사용자에게 필요한 수준으로만 표시하고 PG 내부 raw message, stack trace, billing key는 노출하지 않는다.
* `paymentKey`, `orderId`, `billingKey`, 카드 정보는 localStorage에 저장하지 않는다.
* 결제/구독 API 호출은 View에서 직접 수행하지 않고 `api/subscription/` 또는 `hooks/subscription/`에 위치한다.

---

## 5. 연동 계약

* **Member 도메인**: 로그인된 사용자만 구독/결제 페이지에 접근 가능하다. 제재/블랙리스트 회원은 결제 요청이 차단될 수 있다.
* **AI Document 도메인**: `document-coaching` 구독 권한과 사용량을 제공한다.
* **AI Interview 도메인**: `interview` 구독 권한과 사용량을 제공한다.
* **Payment Backend**: order 생성, Toss Payments confirm, 결제 실패 저장, 결제 내역 조회, 환불/해지 처리를 담당한다.
* **Toss Payments**: 실제 카드/정기결제 승인 UI와 redirect 파라미터를 제공한다. 프론트는 SDK/redirect 결과를 백엔드에 전달한다.

---

## 6. 금지 패턴

* query string의 상품명/가격만 믿고 결제 금액을 확정하는 패턴 금지.
* success URL 직접 접근만으로 구독 활성화 UI를 표시하는 패턴 금지.
* 결제 완료 후 구독 상태를 local state만 변경하고 서버 재조회하지 않는 패턴 금지.
* 결제 민감정보를 localStorage/sessionStorage에 저장 금지.
* 해지 버튼 클릭 즉시 API 호출 금지. confirm modal 필수.
* 결제 실패 raw error를 그대로 사용자에게 노출 금지.
* mock 결제 flow가 production build에 남는 것 금지.

---

## 7. 품질 및 안정성

* **결제 상태 복원력**: success/fail redirect 또는 새로고침 후에는 `orderId` 기반 결제 상태 조회를 수행한다. 조회 전에는 최종 성공/실패 UI를 확정하지 않는다.
* **중복 요청 방지**: checkout order 생성, Toss confirm, 구독 해지 요청은 모두 요청 중 버튼 비활성화와 idempotency key를 전제로 한다.
* **서버 상태 우선**: TanStack Query 캐시와 화면 local state가 다를 경우 서버 재조회 결과를 우선한다. 결제/구독 권한은 local state만으로 활성화하지 않는다.
* **접근성(a11y)**: checkout 동의 체크박스, 결제 버튼, 구독 해지 confirm modal은 키보드만으로 조작 가능해야 한다. 결제 진행/확인 상태는 `aria-live="polite"`로 전달한다.
* **성능**: 결제 내역이 길어질 경우 pagination을 기본으로 사용하고, 한 화면에 과도한 DOM row를 렌더링하지 않는다.
* **장애 대응**: PG confirm timeout, 백엔드 500, 네트워크 단절, 사용자의 뒤로가기/새로고침은 모두 "결제 확인 중" 또는 상태 재조회 흐름으로 복구한다.
* **보안 추적성**: 결제 요청, 결제 실패, 구독 해지, 환불 요청은 백엔드 audit/payment log 대상이다. 프론트는 사용자 표시 문구와 내부 `reasonCode`를 분리하여 처리한다.
