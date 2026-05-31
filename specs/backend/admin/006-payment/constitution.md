# Constitution: 결제·정산 관리 API (Payment & Settlement)

**Feature Branch**: `feature/admin-payment-be-spec`
**Scope**: 결제 내역 조회 / 환불 처리 / 구독 현황 조회
**버전**: v1
**담당**: 신보라

---

## 1. 도메인 가치

CS 관리자는 회원의 프리미엄 구독 결제 내역을 조회하고,
환불 요청 건의 조건을 검증한 뒤 Toss 환불 API를 통해 확정 또는 불가 처리를 수행한다.
Toss API 장애가 결제 내역 조회 등 핵심 기능에 영향을 주어서는 안 된다.

---

## 2. 상태 머신

### payments.payment_status 전이

```text
PENDING ──► DONE ──► CANCELED  (환불 확정 후)
        └──► FAILED
```

| 전이 | 허용 여부 | 처리 방식 |
|---|---|---|
| PENDING → DONE | 허용 | Toss 승인 완료 (user-backend 담당) |
| PENDING → FAILED | 허용 | Toss 승인 실패 (user-backend 담당) |
| DONE → CANCELED | 허용 | `payment.cancel()` — 환불 확정 트랜잭션 내 |
| CANCELED → 기타 | 금지 | 상태 변경 불가 |
| FAILED → 기타 | 금지 | 상태 변경 불가 |

### refunds.refund_status 전이

```text
PENDING ──► COMPLETED  (환불 처리 확정)
        └──► REJECTED   (환불 불가 처리)
        └──► FAILED     (Toss API 실패)
```

| 전이 | 허용 여부 | 트리거 |
|---|---|---|
| PENDING → COMPLETED | 허용 | `refund.complete()` — Toss 성공 후 |
| PENDING → REJECTED | 허용 | `refund.reject()` |
| PENDING → FAILED | 허용 | `refund.fail()` — Toss 실패 시 |
| COMPLETED → 기타 | 금지 | `REFUND_NOT_PENDING(409)` |
| REJECTED → 기타 | 금지 | `REFUND_NOT_PENDING(409)` |

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|---|---|---|
| 컨트롤러 분리 | AdminPaymentController / AdminSubscriptionController | 도메인별 책임 분리 |
| 환불 경로 | `POST /api/admin/payments/{paymentId}/refund` | FE에서 paymentId 기준 호출, refundId 별도 조회 불필요 |
| Toss API 호출 | Service 레이어에서 RestTemplate/WebClient | Controller에서 외부 API 직접 호출 금지 |
| 트랜잭션 범위 | 환불 확정 시 `refund.complete()` + `payment.cancel()` 동일 트랜잭션 | Toss 성공 후 DB 상태 원자적 처리 |
| Toss 실패 처리 | `refund.fail()` 후 `TOSS_REFUND_FAILED(502)` | payment_status 변경 없이 재처리 가능하도록 |
| AI 이용 현황 | 결제 상세 조회 시 포함 | 환불 가능 여부 판단에 필요한 정보 |
| 구독 조회 | admin 전용 SubscriptionRepository | user 패키지 직접 참조 금지 (CONVENTION.md) |
| page 1-based | Controller에서 `page - 1` 변환 후 Pageable 전달 | FE 계약(`page=1`이 첫 페이지) 준수 |
| 정산 리포트 | v2 예정, v1 미구현 | supply_amount·vat 컬럼만 미리 저장 |
| 멘토 정산 | 미구현 | CareerWave는 멘토 서비스 미제공 |

---

## 4. 불변 규칙

- `refund_status != PENDING` 건에 환불 처리를 시도하면 반드시 `REFUND_NOT_PENDING(409)` 예외를 발생시킨다.
- 환불 처리 확정 시 `refund.complete()` + `payment.cancel()`은 반드시 동일 `@Transactional` 범위 내에서 처리한다.
- Toss 환불 API 실패 시 `payment_status`를 변경하지 않는다. `refund_status → FAILED`만 기록한다.
- 환불 불가 처리 시 `rejectReason` blank → `REJECT_REASON_REQUIRED(400)` 예외 필수.
- 상태 전이는 반드시 Entity 비즈니스 메서드(`cancel`, `complete`, `reject`, `fail`)를 통해서만 수행한다. 직접 필드 변경 금지.
- `PaymentStatus`, `RefundStatus`, `SubStatus` enum 값은 ERD 기준 값만 사용한다.
- `user/` 패키지 클래스를 `admin/payment/`에서 직접 import하는 것을 금지한다.
- Controller에서 `try-catch`로 비즈니스 예외를 처리하는 것을 금지한다. `GlobalExceptionHandler`에 위임한다.
- 멘토 정산 관련 코드·enum·엔드포인트를 추가하는 것을 금지한다.
- 정산 리포트 API를 v1에서 구현하는 것을 금지한다.

---

## 5. 연동 계약

- 프론트엔드 HTTP 계약 원본: `specs/frontend/admin/006-payment/api-schema.md`
- 제공 엔드포인트:
  - `GET /api/admin/payments/summary`
  - `GET /api/admin/payments`, `GET /api/admin/payments/{paymentId}`
  - `POST /api/admin/payments/{paymentId}/refund`
  - `POST /api/admin/payments/{paymentId}/refund-reject`
  - `GET /api/admin/subscriptions`
- 환불 처리 확정 성공 응답에 변경된 `paymentStatus(CANCELED)`, `refundStatus(COMPLETED)`가 포함되어야 한다.
- 환불 불가 처리 성공 응답에 변경된 `refundStatus(REJECTED)`가 포함되어야 한다.

---

## 6. 금지 패턴

- `COMPLETED` / `REJECTED` 환불 건에 재처리 메서드를 실행하는 것을 금지한다.
- Toss 환불 API 성공 없이 `payment_status → CANCELED`로 변경하는 것을 금지한다.
- Entity를 직접 반환하거나 `Map`을 직접 반환하는 것을 금지한다. `ApiResponse<DTO>`를 사용한다.
- `new RuntimeException(...)`을 직접 생성하는 것을 금지한다. `CustomException(ErrorCode.xxx)`를 사용한다.
- Spring 기본 `Page<T>` 객체를 API 응답으로 직접 반환하는 것을 금지한다. `PaginationResponse<T>`를 사용한다.
- 멘토 정산 관련 상태값(`SettlementStatus` 등)을 코드에서 가정하는 것을 금지한다.
