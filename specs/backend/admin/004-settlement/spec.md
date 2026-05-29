# Feature Specification: 결제·정산 관리 API (Payment & Settlement)

**Feature Branch**: `feature/admin-payment-api`
**Status**: Draft
**담당**: 신보라

---

## 도메인 개요

Toss Payments PG 연동 기반의 프리미엄 구독 결제 처리 및 CS 관리자 환불 처리 API.
`payments` 테이블은 Toss 결제 상태를 관리하고, `refunds` 테이블은 환불 요청·처리 라이프사이클을 별도로 관리한다.

---

## ERD

### payments
```sql
payment_id      UUID        PK DEFAULT gen_random_uuid()
member_id       UUID        FK NOT NULL  REFERENCES members(id)
plan_id         BIGINT      FK NOT NULL  REFERENCES plans(plan_id)
buyer_name      VARCHAR     NOT NULL                  -- 결제 시점 스냅샷
buyer_email     VARCHAR     NOT NULL                  -- 결제 시점 스냅샷
payment_key     VARCHAR     NULL UNIQUE               -- Toss 결제 키 (FAILED 시 NULL)
order_id        VARCHAR     NOT NULL UNIQUE           -- Toss 주문번호
amount          INT         NOT NULL
supply_amount   INT         NOT NULL                  -- 공급가액 (정산용)
vat             INT         NOT NULL                  -- 부가세 (정산용)
payment_status  VARCHAR     NOT NULL                  -- PENDING / DONE / CANCELED / FAILED
payment_type    VARCHAR     NOT NULL                  -- MANUAL / AUTO_RENEWAL
payment_method  VARCHAR     NULL
approved_at     TIMESTAMPTZ NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

CONSTRAINT chk_payment_status
  CHECK (payment_status IN ('PENDING','DONE','CANCELED','FAILED'))
CONSTRAINT chk_payment_type
  CHECK (payment_type IN ('MANUAL','AUTO_RENEWAL'))
```

### refunds
```sql
refund_id     BIGSERIAL   PK
payment_id    UUID        FK NOT NULL  REFERENCES payments(payment_id)
admin_id      BIGINT      FK NULL      REFERENCES admins(admin_id)  -- PENDING 시 NULL
amount        INT         NOT NULL
reason        TEXT        NOT NULL
refund_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
              CHECK (refund_status IN ('PENDING','COMPLETED','FAILED','REJECTED'))
reject_reason TEXT        NULL                        -- REJECTED 시 필수
refunded_at   TIMESTAMPTZ NULL                        -- COMPLETED 시 필수
created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()

CONSTRAINT chk_reject_reason
  CHECK (refund_status != 'REJECTED' OR reject_reason IS NOT NULL)
CONSTRAINT chk_refunded_at
  CHECK (refund_status != 'COMPLETED' OR refunded_at IS NOT NULL)
```

---

## User Stories & Acceptance Scenarios

### Story 1 — 결제 내역 목록 조회 (Priority: P1)

> CS 관리자는 결제 내역을 검색·필터링하여 조회할 수 있다.

**Acceptance Scenarios**:
1. **Given** 관리자 인증 토큰, **When** `GET /admin/payments` 요청, **Then** 결제 목록 + 페이징 정보 반환
2. **Given** `status=DONE` 쿼리, **When** 조회, **Then** `payment_status = DONE` 건만 반환
3. **Given** `keyword=홍길동` 쿼리, **When** 조회, **Then** `buyer_name` 포함 건만 반환
4. **Given** 환불 요청 건, **When** 목록 조회, **Then** `refund_status` 필드가 함께 반환된다 (JOIN)

---

### Story 2 — 결제 상세 조회 (Priority: P1)

> CS 관리자는 특정 결제 건의 상세 정보와 AI 이용 현황을 조회할 수 있다.

**Acceptance Scenarios**:
1. **Given** 유효한 `paymentId`, **When** `GET /admin/payments/{paymentId}`, **Then** 결제 정보 + AI 이용 현황 반환
2. **Given** 존재하지 않는 `paymentId`, **When** 조회, **Then** 404 반환

---

### Story 3 — 환불 처리 확정 (Priority: P1)

> CS 관리자는 환불 조건을 충족한 `PENDING` 환불 건을 확정 처리할 수 있다.

**Acceptance Scenarios**:
1. **Given** `refund_status = PENDING` 건 + 환불 조건 충족, **When** `POST /admin/refunds/{refundId}/approve`, **Then** Toss 환불 API 호출 → `refund_status: COMPLETED`, `payment_status: CANCELED` 처리 후 200 반환
2. **Given** 이미 `COMPLETED` 건, **When** 재요청, **Then** 409 반환
3. **Given** `refund_status = PENDING` 건 + Toss 환불 API 실패, **When** 처리, **Then** `refund_status: FAILED` 처리 후 에러 반환

---

### Story 4 — 환불 불가 처리 (Priority: P1)

> CS 관리자는 환불 조건 미충족 건에 대해 불가 처리를 할 수 있다.

**Acceptance Scenarios**:
1. **Given** `refund_status = PENDING` 건, **When** `POST /admin/refunds/{refundId}/reject` + `reject_reason`, **Then** `refund_status: REJECTED` 처리 후 200 반환. `payment_status` 유지.
2. **Given** `reject_reason` 미입력, **When** 요청, **Then** 400 반환

---

### Story 5 — 환불 가능 여부 조회 (Priority: P1)

> CS 관리자는 환불 요청 건의 조건 충족 여부를 API로 확인할 수 있다.

**Acceptance Scenarios**:
1. **Given** 유효한 `refundId`, **When** `GET /admin/refunds/{refundId}/eligibility`, **Then** 다음을 반환:
   - `daysSincePaid`: 결제일로부터 경과일
   - `withinPeriod`: 7일 이내 여부
   - `resumePaidCount`: 유료 이력서 분석 이용 횟수
   - `interviewPaidCount`: 유료 AI 면접 이용 횟수
   - `eligible`: 최종 환불 가능 여부
   - `ineligibleReason`: 불가 사유 (가능 시 null)

---

### Story 6 — 구독 현황 목록 조회 (Priority: P1)

> CS 관리자는 구독자 현황을 상태별로 조회할 수 있다.

**Acceptance Scenarios**:
1. **Given** 관리자 인증 토큰, **When** `GET /admin/subscriptions`, **Then** 구독 현황 목록 반환
2. **Given** `status=AT_RISK` 쿼리, **When** 조회, **Then** 가장 최근 `AUTO_RENEWAL` 결제가 `FAILED`인 구독자만 반환

---

### Edge Cases

- `payment_key = NULL` (FAILED 결제)에 환불 요청이 생성된 경우 → Toss 환불 API 호출 불가. `refund_status: FAILED` 처리.
- 동일 `payment_id`에 `PENDING` 환불이 이미 존재하는 상태에서 중복 환불 요청 → 409 반환
- 환불 처리 중 Toss API 타임아웃 → `refund_status: FAILED` 기록 후 재처리 가능하도록 설계

---

## API 명세

### 결제 내역

| Method | Path | Description |
|---|---|---|
| GET | `/admin/payments` | 결제 내역 목록 조회 |
| GET | `/admin/payments/{paymentId}` | 결제 상세 조회 |

#### GET /admin/payments

**Query Parameters**:
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `keyword` | String | 결제 ID / Toss 주문번호 / 회원명 검색 |
| `status` | PaymentStatus | PENDING / DONE / CANCELED / FAILED |
| `productName` | String | 상품명 필터 |
| `page` | int | 페이지 번호 (default: 0) |
| `size` | int | 페이지 크기 (default: 20) |

**Response**:
```json
{
  "content": [
    {
      "paymentId": "uuid",
      "orderId": "TOSS-20260501-A1B2C3",
      "memberName": "홍길동",
      "product": "프리미엄 월정액",
      "paidAt": "2026-05-01T10:00:00Z",
      "amount": 29000,
      "paymentStatus": "DONE",
      "paymentType": "MANUAL",
      "refundStatus": "PENDING"       // refunds 테이블 JOIN, 없으면 null
    }
  ],
  "totalElements": 11,
  "totalPages": 1,
  "page": 0,
  "size": 20
}
```

#### GET /admin/payments/{paymentId}

**Response**:
```json
{
  "paymentId": "uuid",
  "orderId": "TOSS-20260501-A1B2C3",
  "memberName": "홍길동",
  "memberEmail": "hong@example.com",
  "product": "프리미엄 월정액",
  "paidAt": "2026-05-01T10:00:00Z",
  "amount": 29000,
  "paymentStatus": "DONE",
  "paymentType": "MANUAL",
  "paymentMethod": "카드",
  "refundStatus": "PENDING",
  "aiUsage": {
    "resumePaidCount": 2,
    "interviewPaidCount": 0
  }
}
```

---

### 환불 처리

| Method | Path | Description |
|---|---|---|
| GET | `/admin/refunds/{refundId}/eligibility` | 환불 가능 여부 조회 |
| POST | `/admin/refunds/{refundId}/approve` | 환불 처리 확정 |
| POST | `/admin/refunds/{refundId}/reject` | 환불 불가 처리 |

#### GET /admin/refunds/{refundId}/eligibility

**Response**:
```json
{
  "refundId": 1,
  "paymentId": "uuid",
  "daysSincePaid": 3,
  "withinPeriod": true,
  "resumePaidCount": 0,
  "interviewPaidCount": 0,
  "eligible": true,
  "ineligibleReason": null
}
```

#### POST /admin/refunds/{refundId}/approve

**Response**: 200 OK
```json
{
  "refundId": 1,
  "refundStatus": "COMPLETED",
  "refundedAt": "2026-05-28T14:00:00Z"
}
```

#### POST /admin/refunds/{refundId}/reject

**Request Body**:
```json
{
  "rejectReason": "결제일로부터 7일 초과로 환불 불가"
}
```

**Response**: 200 OK
```json
{
  "refundId": 1,
  "refundStatus": "REJECTED",
  "rejectReason": "결제일로부터 7일 초과로 환불 불가"
}
```

---

### 구독 현황

| Method | Path | Description |
|---|---|---|
| GET | `/admin/subscriptions` | 구독 현황 목록 조회 |

**Query Parameters**:
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `status` | SubStatus | ACTIVE / RENEWAL_SCHEDULED / CANCEL_SCHEDULED / AT_RISK |
| `page` | int | 페이지 번호 |
| `size` | int | 페이지 크기 |

---

## Functional Requirements

- **FR-001**: 결제 목록 조회 시 `refunds` 테이블을 LEFT JOIN하여 `refund_status`를 함께 반환한다.
- **FR-002**: 결제 상세 조회 시 AI 이용 현황(`resumePaidCount`, `interviewPaidCount`)을 함께 반환한다.
- **FR-003**: 환불 처리 확정 시 Toss 환불 API를 호출하고, 성공 시 `payment_status → CANCELED`, `refund_status → COMPLETED`를 트랜잭션으로 처리한다.
- **FR-004**: Toss 환불 API 실패 시 `refund_status → FAILED` 처리하며 `payment_status`는 유지한다.
- **FR-005**: 환불 불가 처리 시 `payment_status`를 변경하지 않고 `refund_status → REJECTED`, `reject_reason`을 기록한다.
- **FR-006**: `AT_RISK` 구독자 조회는 서브쿼리로 가장 최근 `AUTO_RENEWAL` 결제가 `FAILED`인 `member_id`를 추출하여 적용한다.
- **FR-007**: 모든 관리자 API는 JWT 인증 + ADMIN 권한 검증을 거친다.
- **FR-008**: 환불 중복 요청 방지 — `payment_id` 기준 `PENDING` 상태 환불이 이미 존재하면 409 반환.

---

## Success Criteria

- **SC-001**: 결제 내역 목록 조회 응답 1초 이하 (인덱스: `payment_status`, `created_at`, `member_id`)
- **SC-002**: 환불 처리 확정 — Toss API 호출 실패 시 DB 상태가 오염되지 않도록 트랜잭션 롤백 보장
- **SC-003**: 환불 가능 여부 API가 프론트 검증 로직과 동일한 결과를 반환한다 (7일 기준 / AI 이용 횟수)
- **SC-004**: `AT_RISK` 집계 쿼리 응답 2초 이하

---

## Assumptions

- Toss Payments 환불 API: `POST https://api.tosspayments.com/v1/payments/{paymentKey}/cancel`
- `payment_key = NULL` (FAILED 결제)는 Toss 환불 API 호출 불가 — 환불 요청 자체가 생성되면 안 됨 (프론트에서 버튼 비노출로 1차 방어)
- AI 이용 횟수 조회 대상: `resume_analysis_logs`, `interview_logs` 테이블 (유료 이용 건만 카운트)
- 정산 리포트(공급가액/부가세 집계) API는 v2 예정 — `supply_amount`, `vat` 컬럼은 v2 대비 미리 저장
- 부분 환불 없음 — `refunds.amount = payments.amount` 전액 고정
