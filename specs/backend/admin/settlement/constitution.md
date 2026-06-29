# Constitution: 정산 리포트 관리 API (Settlement Report)

**Feature Branch**: `feat/settlement-report`
**Scope**: 정산 리포트 생성(집계) / 목록·상세 조회 / 정산 확정
**버전**: v1
**담당**: 신보라

---

## 1. 도메인 원칙

어드민은 월별 결제/환불 데이터를 집계하여 정산 리포트를 생성하고 확정한다.
어드민은 payments/refunds 원본 데이터를 수정하지 않는다 — 정산은 읽기 기반 집계만 수행한다.
정산 확정은 되돌릴 수 없다 — CONFIRMED 상태에서 PENDING으로 복원하지 않는다.

---

## 2. 상태 머신

### settlement_reports.settlement_status 전이

```text
PENDING ──► CONFIRMED  (관리자 확정)
```

| 전이 | 허용 여부 | 사유 |
|------|-----------|------|
| PENDING → CONFIRMED | 허용 | `confirmSettlement()` — 관리자 확정 |
| CONFIRMED → PENDING | **금지** | 확정 후 되돌리기 불가 |
| CONFIRMED → CONFIRMED | **금지** | `ALREADY_CONFIRMED(409)` |

---

## 3. 아키텍처 결정

| 결정 | 내용 | 근거 |
|------|------|------|
| 컨트롤러 단일 | AdminSettlementController 1개 | 도메인 범위가 정산 리포트 하나 |
| 집계 방식 | 생성 시점에 payments/refunds 스냅샷 저장 | 과거 정산 데이터 변경 방지 |
| settlement_items | 정산 ↔ 결제 매핑 테이블 | 집계 검증 및 결제 건별 추적 |
| VAT 계산 | `supply = net * 10 / 11` (원 단위 절사) | B2C 카드결제 기준, KRW 단일 통화 |
| 정산 기간 | 월 단위 | 종합소득세/연말정산 목적 |
| 중복 방지 | UNIQUE(periodStart, periodEnd) | 동일 기간 이중 집계 방지 |
| 감사 로그 | 생성·확정 시 AuditLog 기록 | 기존 감사 로그 패턴 준수 |
| page 1-based | Controller에서 변환 후 전달 | FE 계약 준수 |
| 스케줄러 | v1 미구현 (수동 생성만) | 자동 생성 정책 미확정 |
| 권한 제한 | v1 미확정 (MASTER만 확정 가능 여부) | 구현 단계에서 결정 |

---

## 4. 불변 규칙

- `settlement_status != PENDING` 건에 확정을 시도하면 반드시 `ALREADY_CONFIRMED(409)` 예외를 발생시킨다.
- 상태 전이는 반드시 Entity 비즈니스 메서드(`confirm`)를 통해서만 수행한다. 직접 필드 변경 금지.
- 정산 생성 시 동일 기간(periodStart, periodEnd) 중복이면 반드시 `DUPLICATE_PERIOD(409)` 예외를 발생시킨다.
- 정산 생성 시 `periodStart >= periodEnd`이면 반드시 `INVALID_PERIOD(400)` 예외를 발생시킨다.
- 정산 리포트 생성은 payments/refunds 데이터를 읽기만 한다. 원본 상태를 수정하지 않는다.
- `SettlementStatus` enum 값은 `PENDING`, `CONFIRMED`만 사용한다.
- Controller에서 `try-catch`로 비즈니스 예외를 처리하는 것을 금지한다. `GlobalExceptionHandler`에 위임한다.
- `admin/settlement/` 패키지가 `user/` 패키지 클래스를 직접 import하는 것을 금지한다.

---

## 5. 연동 계약

- 제공 엔드포인트:
  - `GET /api/v1/admin/settlements`
  - `GET /api/v1/admin/settlements/{settlementId}`
  - `POST /api/v1/admin/settlements/generate`
  - `PATCH /api/v1/admin/settlements/{settlementId}/confirm`
- 정산 생성 시 `payments` 테이블에서 `payment_status = 'PAID'` AND `approved_at` 기간 조건으로 집계한다.
- 정산 생성 시 `refunds` 테이블에서 `refund_status = 'COMPLETED'` AND `refunded_at` 기간 조건으로 집계한다.
- 정산 확정 성공 응답에 `settlementStatus: CONFIRMED`, `settledAt`이 포함되어야 한다.

---

## 6. 금지 패턴

- `CONFIRMED` 정산에 재확정 메서드를 실행하는 것을 금지한다.
- 정산 생성 시 payments/refunds 원본 데이터를 수정하는 것을 금지한다.
- Entity를 직접 반환하거나 `Map`을 직접 반환하는 것을 금지한다. `ApiResponse<DTO>`를 사용한다.
- `new RuntimeException(...)`을 직접 생성하는 것을 금지한다. `CustomException(ErrorCode.xxx)`를 사용한다.
- Spring 기본 `Page<T>` 객체를 API 응답으로 직접 반환하는 것을 금지한다. `PaginationResponse<T>`를 사용한다.
- 멘토 정산 관련 코드·enum·엔드포인트를 추가하는 것을 금지한다.
