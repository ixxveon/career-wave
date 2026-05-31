# Feature Specification: 결제·정산 관리 (Payment & Settlement)

**Feature Branch**: `feature/admin-payment-ui`
**버전**: v1
**Status**: UI 구현 완료 — API 연동 예정
**담당**: 신보라

---

## 도메인 개요

CareerWave 프리미엄 구독(월정액) 결제 내역을 관리하고, 환불 요청 건을 CS 관리자가 검토·처리하는 어드민 페이지.
Toss Payments PG 연동 기준이며, 결제 상태(`payments`)와 환불 라이프사이클(`refunds`)을 별도 테이블로 분리 관리한다.

- 정산 리포트 탭은 v2 예정 — v1에서는 탭 표시 후 블라인드 처리
- 멘토 정산 기능 없음 (CareerWave는 멘토 서비스 미제공)

---

## 상태 정의

### payments.payment_status

| 값 | 표시 | 설명 |
|---|---|---|
| `PENDING` | 결제 대기 | 결제 요청 생성, Toss 승인 전 |
| `DONE` | 결제 완료 | Toss 승인 완료, 정상 이용 가능 |
| `CANCELED` | 환불 완료 | Toss 환불 처리 완료 |
| `FAILED` | 결제 실패 | Toss 승인 실패 또는 자동갱신 결제 실패 |

### payments.payment_type

| 값 | 표시 | 설명 |
|---|---|---|
| `MANUAL` | 직접 결제 | 회원이 직접 결제 |
| `AUTO_RENEWAL` | 자동 갱신 | 구독 자동갱신 결제 |

### refunds.refund_status

| 값 | 표시 | 설명 |
|---|---|---|
| `PENDING` | 환불 요청 | 회원 환불 요청, 관리자 검토 대기 |
| `COMPLETED` | 환불 완료 | 관리자 확정 → Toss 환불 API 호출 완료 |
| `FAILED` | 환불 실패 | Toss 환불 API 호출 실패 |
| `REJECTED` | 환불 불가 | 환불 조건 미충족, 관리자 불가 처리 |

### subscriptions.sub_status

| 값 | 표시 | 설명 |
|---|---|---|
| `ACTIVE` | 활성 | 정상 이용 중 |
| `RENEWAL_SCHEDULED` | 갱신예정 | D-7 이내 자동갱신 예정 |
| `CANCEL_SCHEDULED` | 취소예정 | 구독 해지 신청, 기간 만료 후 종료 |
| `AT_RISK` | 이탈위험 | 가장 최근 AUTO_RENEWAL 결제가 FAILED |

### 상태 전이도

```text
[결제 흐름]
payments: PENDING ──► DONE ──► CANCELED (환불 완료 후)
                  └──► FAILED

[환불 흐름]
refunds: PENDING ──► COMPLETED ──► (payments: CANCELED)
              └──► REJECTED
              └──► FAILED (Toss API 실패)
```

---

## User Stories & Acceptance Scenarios

### Story 1 — 결제 내역 조회 (Priority: P1)

> CS 관리자는 전체 결제 내역을 검색·필터링하여 특정 건의 상세 정보를 확인할 수 있다.

**Acceptance Scenarios**:
1. **Given** 관리자 로그인, **When** 결제 내역 탭 진입, **Then** 결제 ID / Toss 주문번호 / 회원명 / 상품명 / 유형 / 결제일 / 금액 / 상태 / 관리 컬럼 목록이 표시된다.
2. **Given** 결제 목록, **When** 키워드(결제ID/주문번호/회원명) 입력, **Then** 일치 결과만 필터링된다.
3. **Given** 결제 목록, **When** 상태 필터(결제완료/결제대기/환불완료/결제실패) 선택, **Then** 해당 상태 건만 표시된다.
4. **Given** 상태 배지, **When** `refundStatus` 존재 시, **Then** 결제 상태 대신 환불 상태 배지를 우선 표시한다.
5. **Given** 결제 목록, **When** "상세보기" 클릭, **Then** 결제 정보 모달이 표시된다.

---

### Story 2 — KPI 집계 확인 (Priority: P1)

> CS 관리자는 이번달 결제 현황을 한눈에 파악할 수 있다.

**Acceptance Scenarios**:
1. **Given** 결제 내역 탭, **When** 페이지 진입, **Then** KPI 카드 4종이 표시된다.
   - 이번달 총 매출: `payment_status = DONE` 건의 합산 금액
   - 결제 건수: `payment_status = DONE` 건 수
   - 환불 요청: `refund_status = PENDING` 건 수
   - 결제 실패: `payment_status = FAILED` 건 수

---

### Story 3 — 환불 가능 여부 검토 (Priority: P1)

> CS 관리자는 환불 요청 건의 환불 조건 충족 여부를 자동으로 확인할 수 있다.

**Acceptance Scenarios**:
1. **Given** `refund_status = PENDING` 건, **When** "환불 처리" 버튼 클릭, **Then** 환불 가능 여부 확인 섹션이 포함된 모달이 표시된다.
2. **Given** 환불 조건 충족 시 (결제일 포함 7일 이내 + 유료 AI 기능 미이용), **Then** "환불 가능" 배지 + "환불 처리 확정" 버튼이 표시된다.
3. **Given** 환불 조건 미충족 시 (7일 초과 또는 AI 기능 이용 이력 있음), **Then** "환불 불가" 배지 + 불가 사유 + "환불 불가 처리" 버튼이 표시된다.
4. **Given** 환불 확인 섹션, **When** 경과일 표시, **Then** "N일 경과 (7일 이내/초과)" 형태로 표시된다.
5. **Given** AI 이용 이력 표시, **Then** 이력서 분석 유료 이용 횟수 / AI 면접 유료 이용 횟수가 각각 표시된다.

---

### Story 4 — 환불 처리 확정 (Priority: P1)

**Acceptance Scenarios**:
1. **Given** 환불 조건 충족 건, **When** "환불 처리 확정" 클릭, **Then** `payment_status → CANCELED`, `refund_status → COMPLETED` 로 변경된다.
2. **Given** 환불 처리 완료 건, **When** 목록 확인, **Then** 상태 배지가 "환불 완료"로 표시된다.

---

### Story 5 — 환불 불가 처리 (Priority: P1)

**Acceptance Scenarios**:
1. **Given** 환불 조건 미충족 건, **When** "환불 불가 처리" 클릭, **Then** `payment_status` 유지(DONE), `refund_status → REJECTED` 로 변경된다.
2. **Given** 환불 불가 처리 완료 건, **When** 목록 확인, **Then** 상태 배지가 "환불 불가"로 표시된다.

---

### Story 6 — 구독 현황 조회 (Priority: P1)

**Acceptance Scenarios**:
1. **Given** 구독 현황 탭, **When** 진입, **Then** KPI 카드 4종(활성/갱신예정/취소예정/이탈위험)과 구독 목록이 표시된다.
2. **Given** 구독 목록, **When** 상태 필터 선택, **Then** 해당 상태 구독자만 표시된다.
3. **Given** `AT_RISK` 구독자, **Then** 가장 최근 AUTO_RENEWAL 결제가 FAILED인 회원이다.

---

### Story 7 — 정산 리포트 (Priority: P3 / v2 예정)

**Acceptance Scenarios**:
1. **Given** 정산 리포트 탭 클릭, **When** v1 상태, **Then** "다음 버전에 구현 될 예정입니다." 안내 화면이 표시된다.

---

### Edge Cases

- `PENDING` 결제(Toss 미승인)에 환불 요청 → `payment_status = PENDING`은 환불 처리 대상 아님, 환불 처리 버튼 비노출
- `FAILED` 결제에 환불 요청 → 결제 실패 건은 환불 대상 아님, 버튼 비노출
- `refund_status = COMPLETED` 건 재환불 시도 → 처리 버튼 비노출, 상태 "환불 완료" 표시만
- `refund_status = REJECTED` 건 재처리 시도 → 처리 버튼 비노출, 상태 "환불 불가" 표시만

---

## Functional Requirements

- **FR-001**: 결제 목록을 결제 ID / Toss 주문번호 / 회원명으로 키워드 검색
- **FR-002**: 결제 목록을 `payment_status` 기준으로 필터링
- **FR-003**: 상태 배지는 `refundStatus` 존재 시 환불 상태를 우선 표시
- **FR-004**: `refund_status = PENDING` 건에 한해 "환불 처리" 버튼 노출
- **FR-005**: 환불 조건 자동 검증 — 결제일 포함 7일 이내 여부 계산
- **FR-006**: 환불 조건 자동 검증 — 유료 이력서 분석 / AI 면접 이용 횟수 표시
- **FR-007**: 환불 처리 확정 시 `payment_status → CANCELED`, `refund_status → COMPLETED`
- **FR-008**: 환불 불가 처리 시 `payment_status` 유지, `refund_status → REJECTED`
- **FR-009**: 구독 목록을 `sub_status` 기준으로 필터링
- **FR-010**: `AT_RISK` — 가장 최근 AUTO_RENEWAL 결제가 FAILED인 구독자 기준
- **FR-011**: 정산 리포트 탭은 v2 예정 안내 화면으로 블라인드 처리

---

## Key Entities

### payments

| 필드 | 타입 | 설명 |
|---|---|---|
| `payment_id` | UUID PK | 결제 고유 ID |
| `member_id` | UUID FK | 결제 회원 |
| `plan_id` | BIGINT FK | 구독 플랜 |
| `buyer_name` | VARCHAR NOT NULL | 결제 시점 이름 스냅샷 |
| `buyer_email` | VARCHAR NOT NULL | 결제 시점 이메일 스냅샷 |
| `payment_key` | VARCHAR NULL UNIQUE | Toss 결제 키 (FAILED 시 NULL) |
| `order_id` | VARCHAR NOT NULL UNIQUE | Toss 주문번호 |
| `amount` | INT NOT NULL | 결제 금액 |
| `supply_amount` | INT NOT NULL | 공급가액 (정산 리포트 v2용) |
| `vat` | INT NOT NULL | 부가세 (정산 리포트 v2용) |
| `payment_status` | VARCHAR NOT NULL | PENDING / DONE / CANCELED / FAILED |
| `payment_type` | VARCHAR NOT NULL | MANUAL / AUTO_RENEWAL |
| `payment_method` | VARCHAR NULL | 결제 수단 |
| `approved_at` | TIMESTAMPTZ NULL | Toss 승인 시각 |
| `created_at` | TIMESTAMPTZ NOT NULL | 생성 시각 |

### refunds

| 필드 | 타입 | 설명 |
|---|---|---|
| `refund_id` | BIGSERIAL PK | 환불 고유 ID |
| `payment_id` | UUID FK | 연결 결제 건 |
| `admin_id` | BIGINT FK NULL | 처리 관리자 (PENDING 시 NULL) |
| `amount` | INT NOT NULL | 환불 금액 |
| `reason` | TEXT NOT NULL | 환불 사유 |
| `refund_status` | VARCHAR NOT NULL | PENDING / COMPLETED / FAILED / REJECTED |
| `reject_reason` | TEXT NULL | 환불 불가 사유 (REJECTED 시) |
| `refunded_at` | TIMESTAMPTZ NULL | 환불 완료 시각 (COMPLETED 시) |
| `created_at` | TIMESTAMPTZ NOT NULL | 환불 요청 시각 |

### subscriptions

| 필드 | 타입 | 설명 |
|---|---|---|
| `subscription_id` | BIGSERIAL PK | 구독 고유 ID |
| `member_id` | UUID FK | 구독 회원 |
| `payment_id` | UUID FK NULL | 연결 결제 |
| `plan_id` | BIGINT FK | 구독 플랜 |
| `sub_status` | VARCHAR NOT NULL | ACTIVE / RENEWAL_SCHEDULED / CANCEL_SCHEDULED / AT_RISK |
| `start_date` | DATE NOT NULL | 구독 시작일 |
| `renew_date` | DATE NULL | 다음 갱신일 |
| `auto_renew` | BOOLEAN NOT NULL DEFAULT TRUE | 자동 갱신 여부 |
| `created_at` | TIMESTAMPTZ NOT NULL | 생성 시각 |

### plans

| 필드 | 타입 | 설명 |
|---|---|---|
| `plan_id` | BIGSERIAL PK | 플랜 고유 ID |
| `plan_type` | VARCHAR NOT NULL | FREE / PREMIUM |
| `plan_name` | VARCHAR NOT NULL | 플랜명 |
| `plan_price` | INT NOT NULL | 플랜 정가 |
| `is_active` | BOOLEAN NOT NULL DEFAULT TRUE | 현재 판매 여부 |
| `created_at` | TIMESTAMPTZ NOT NULL | 생성 시각 |

---

## 환불 정책

### 전액 환불 조건 (AND)
1. 결제일 포함 **7일 이내**
2. 유료 AI 기능 **미이용** — 이력서 분석 유료 이용 0회 AND AI 면접 유료 이용 0회

### 환불 불가 조건 (OR)
- 결제일 포함 7일 초과
- 이력서 분석 유료 이용 1회 이상
- AI 면접 유료 이용 1회 이상

### 처리 흐름
```
회원 환불 요청
  → refunds 레코드 생성 (refund_status: PENDING)
  → CS 관리자 확인
      ├── 조건 충족 → 환불 처리 확정
      │     → refund_status: COMPLETED, refunded_at 기록
      │     → payment_status: CANCELED
      └── 조건 미충족 → 환불 불가 처리
            → refund_status: REJECTED, reject_reason 기록
            → payment_status 유지 (DONE)
```

---

## Success Criteria

- **SC-001**: 결제 목록 키워드/상태 필터 정확히 동작
- **SC-002**: 환불 가능 여부 검증 (7일 + AI 미이용) 정확히 판단
- **SC-003**: 환불 확정 후 `payment_status → CANCELED` 목록 즉시 반영
- **SC-004**: 환불 불가 처리 후 `refund_status → REJECTED` 배지 즉시 반영
- **SC-005**: `AT_RISK` 구독자 가장 최근 AUTO_RENEWAL FAILED 기준으로 정확히 산출

---

## Assumptions

- 결제 PG는 Toss Payments 단일 연동
- 부분 환불 없음 — 전액 환불만 처리
- 환불 금액 = `payments.amount` 전액
- `supply_amount`, `vat`는 정산 리포트 v2 구현 시 활용 예정
- 구독 플랜은 "프리미엄 월정액" 단일 플랜
- 멘토 정산 기능 없음
