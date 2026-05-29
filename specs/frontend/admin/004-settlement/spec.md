# Feature Specification: 결제·정산 관리 (Payment & Settlement)

**Feature Branch**: `feature/admin-payment-ui`
**Status**: In Progress
**담당**: 신보라

---

## 도메인 개요

CareerWave 프리미엄 구독(월정액) 결제 내역을 관리하고, 환불 요청 건을 CS 관리자가 검토·처리하는 어드민 페이지.
Toss Payments PG 연동 기준이며, 결제 상태(`payments`)와 환불 라이프사이클(`refunds`)을 별도 테이블로 분리 관리한다.

---

## 상태 정의

### payments.payment_status

| 값 | 표시 | 설명 |
|---|---|---|
| `PENDING` | 결제 대기 | 결제 요청 생성, Toss 승인 전 |
| `DONE` | 결제 완료 | Toss 승인 완료, 정상 이용 가능 |
| `CANCELED` | 환불 완료 | Toss 환불 처리 완료 (refunds.COMPLETED 이후 반영) |
| `FAILED` | 결제 실패 | Toss 승인 실패 또는 자동갱신 결제 실패 |

### refunds.refund_status

| 값 | 표시 | 설명 |
|---|---|---|
| `PENDING` | 환불 요청 | 회원이 환불 요청, 관리자 검토 대기 |
| `COMPLETED` | 환불 완료 | 관리자 확정 → Toss 환불 API 호출 완료 |
| `FAILED` | 환불 실패 | Toss 환불 API 호출 실패 |
| `REJECTED` | 환불 불가 | 환불 조건 미충족, 관리자가 불가 처리 |

### 상태 전이도

```
[회원 환불 요청]
payments: DONE ──────────────────────────────────────────────────────► DONE
refunds:  (없음) ──► PENDING ──► COMPLETED ──► (payments: CANCELED)
                         │
                         └──► REJECTED
                         └──► FAILED (Toss API 실패 시)
```

### subscriptions.sub_status (구독 현황)

| 값 | 표시 | 설명 |
|---|---|---|
| `ACTIVE` | 활성 | 정상 이용 중 |
| `RENEWAL_SCHEDULED` | 갱신예정 | D-7 이내 자동갱신 예정 |
| `CANCEL_SCHEDULED` | 취소예정 | 구독 해지 신청, 기간 만료 후 종료 |
| `AT_RISK` | 이탈위험 | 가장 최근 AUTO_RENEWAL 결제가 FAILED |

---

## User Stories & Acceptance Scenarios

### Story 1 — 결제 내역 조회 (Priority: P1)

> CS 관리자는 전체 결제 내역을 검색·필터링하여 특정 건의 상세 정보를 확인할 수 있다.

**Acceptance Scenarios**:
1. **Given** 관리자 로그인 상태, **When** 결제 내역 탭 진입, **Then** 전체 결제 목록이 결제 ID / Toss 주문번호 / 회원명 / 상품명 / 유형 / 결제일 / 금액 / 상태 컬럼으로 표시된다.
2. **Given** 결제 내역 목록, **When** 키워드(결제 ID / 주문번호 / 회원명) 입력, **Then** 해당 키워드를 포함하는 결과만 필터링된다.
3. **Given** 결제 내역 목록, **When** 상태 필터(결제 완료 / 결제 대기 / 환불 완료 / 결제 실패) 선택, **Then** 해당 상태의 건만 표시된다.
4. **Given** 결제 내역 목록, **When** 상세보기 버튼 클릭, **Then** 결제 정보(상품명 / 결제일 / 금액 / 유형 / 현재 상태 / 환불 상태) 모달이 표시된다.

---

### Story 2 — KPI 집계 확인 (Priority: P1)

> CS 관리자는 이번 달 결제 현황을 한눈에 파악할 수 있다.

**Acceptance Scenarios**:
1. **Given** 결제 내역 탭, **When** 페이지 진입, **Then** 다음 4개 KPI 카드가 표시된다.
   - 이번달 총 매출: `payment_status = DONE` 건의 합산 금액
   - 결제 건수: `payment_status = DONE` 건 수
   - 환불 요청: `refund_status = PENDING` 건 수
   - 결제 실패: `payment_status = FAILED` 건 수

---

### Story 3 — 환불 가능 여부 검토 (Priority: P1)

> CS 관리자는 환불 요청 건을 클릭했을 때 환불 조건 충족 여부를 자동으로 확인할 수 있다.

**Acceptance Scenarios**:
1. **Given** `refund_status = PENDING` 건, **When** "환불 처리" 버튼 클릭, **Then** 모달에 환불 가능 여부 확인 섹션이 표시된다.
2. **Given** 환불 가능 여부 확인 섹션, **When** 조건 충족 시 (결제일 포함 7일 이내 + 유료 AI 기능 미이용), **Then** "환불 가능" 뱃지 + "환불 처리 확정" 버튼이 표시된다.
3. **Given** 환불 가능 여부 확인 섹션, **When** 조건 미충족 시 (7일 초과 또는 AI 기능 이용 이력 있음), **Then** "환불 불가" 뱃지 + 불가 사유 + "환불 불가 처리" 버튼이 표시된다.
4. **Given** 환불 가능 여부 확인 섹션, **When** 결제 경과일 표시, **Then** "N일 경과 (7일 이내/초과)" 형태로 표시된다.
5. **Given** 환불 가능 여부 확인 섹션, **When** AI 이용 이력 표시, **Then** 이력서 분석 유료 이용 횟수 / AI 면접 유료 이용 횟수가 각각 표시된다.

---

### Story 4 — 환불 처리 확정 (Priority: P1)

> CS 관리자는 환불 조건을 충족한 요청 건을 확정 처리할 수 있다.

**Acceptance Scenarios**:
1. **Given** 환불 조건 충족 건, **When** "환불 처리 확정" 클릭, **Then** `payment_status → CANCELED`, `refund_status → COMPLETED` 로 변경되고 모달이 닫힌다.
2. **Given** 환불 처리 완료 건, **When** 목록에서 확인, **Then** 상태 뱃지가 "환불 완료"로 표시된다.

---

### Story 5 — 환불 불가 처리 (Priority: P1)

> CS 관리자는 환불 조건 미충족 건에 대해 불가 처리를 할 수 있다.

**Acceptance Scenarios**:
1. **Given** 환불 조건 미충족 건, **When** "환불 불가 처리" 클릭, **Then** `payment_status` 유지(DONE), `refund_status → REJECTED` 로 변경되고 모달이 닫힌다.
2. **Given** 환불 불가 처리 완료 건, **When** 목록에서 확인, **Then** 상태 뱃지가 "환불 불가"로 표시된다.

---

### Story 6 — 구독 현황 조회 (Priority: P1)

> CS 관리자는 전체 구독자 현황을 상태별로 파악할 수 있다.

**Acceptance Scenarios**:
1. **Given** 구독 현황 탭, **When** 페이지 진입, **Then** 활성 / 갱신예정 / 취소예정 / 이탈위험 KPI 카드와 구독 목록이 표시된다.
2. **Given** 구독 현황 목록, **When** 상태 필터 선택, **Then** 해당 상태 구독자만 표시된다.
3. **Given** 구독 현황 목록, **When** `AT_RISK` 구독자 확인, **Then** 해당 회원의 가장 최근 `AUTO_RENEWAL` 결제가 `FAILED` 상태인 건이다.

---

### Story 7 — 정산 리포트 (Priority: P3 / v2 예정)

> CS 관리자는 월별 매출 정산 리포트를 확인할 수 있다.

**Acceptance Scenarios**:
1. **Given** 정산 리포트 탭 클릭, **When** 현재 v1 상태, **Then** "다음 버전에 구현 될 예정입니다." 안내 화면이 표시된다.

---

### Edge Cases

- `PENDING` 결제(Toss 미승인)에 환불 요청이 들어오면?
  → `payment_status = PENDING`은 아직 승인 전이므로 환불 처리 대상 아님. 환불 요청 버튼 비노출.
- `FAILED` 결제에 환불 요청이 들어오면?
  → 결제 자체가 실패했으므로 환불 대상 아님. 환불 요청 버튼 비노출.
- `AUTO_RENEWAL` 결제 건에 환불 요청이 들어오면?
  → 동일 환불 정책 적용 (7일 이내 + AI 미이용). 단, 자동갱신 건은 회원이 직접 요청하는 케이스 드뭄.
- 이미 `refund_status = COMPLETED`인 건을 다시 환불 처리 시도하면?
  → 처리 버튼 비노출. 모달에 환불 상태 "환불 완료" 표시만.
- `refund_status = REJECTED` 건을 다시 환불 처리 시도하면?
  → 처리 버튼 비노출. 모달에 환불 상태 "환불 불가" 표시만.

---

## Functional Requirements

- **FR-001**: 결제 내역 목록을 결제 ID / Toss 주문번호 / 회원명으로 검색할 수 있다.
- **FR-002**: 결제 내역을 `payment_status` 기준으로 필터링할 수 있다.
- **FR-003**: 결제 상세 모달에서 결제 정보 및 환불 상태를 확인할 수 있다.
- **FR-004**: `refund_status = PENDING` 건에 한해 환불 가능 여부 자동 검증 섹션이 노출된다.
- **FR-005**: 환불 조건 검증 — 결제일 포함 7일 이내 여부를 자동 계산한다.
- **FR-006**: 환불 조건 검증 — 유료 이력서 분석 / 유료 AI 면접 이용 횟수를 표시한다.
- **FR-007**: 환불 처리 확정 시 `payment_status → CANCELED`, `refund_status → COMPLETED` 처리한다.
- **FR-008**: 환불 불가 처리 시 `payment_status` 유지, `refund_status → REJECTED` 처리한다.
- **FR-009**: 테이블 상태 뱃지는 `refundStatus` 존재 시 환불 상태를 우선 표시한다.
- **FR-010**: 구독 현황 목록을 `sub_status` 기준으로 필터링할 수 있다.
- **FR-011**: `AT_RISK` 구독 상태는 가장 최근 `AUTO_RENEWAL` 결제가 `FAILED`인 구독자를 기준으로 한다.
- **FR-012**: 정산 리포트 탭은 v2 예정 안내 화면으로 블라인드 처리한다.

---

## Key Entities

### Payment (payments 테이블)
| 필드 | 타입 | 설명 |
|---|---|---|
| `payment_id` | UUID PK | 결제 고유 ID |
| `member_id` | UUID FK | 결제 회원 |
| `plan_id` | BIGINT FK | 구독 플랜 |
| `buyer_name` | VARCHAR | 결제 시점 이름 스냅샷 |
| `buyer_email` | VARCHAR | 결제 시점 이메일 스냅샷 |
| `payment_key` | VARCHAR NULL | Toss 결제 키 (FAILED 시 NULL) |
| `order_id` | VARCHAR UNIQUE | Toss 주문번호 |
| `amount` | INT | 결제 금액 |
| `supply_amount` | INT | 공급가액 (정산 리포트용) |
| `vat` | INT | 부가세 (정산 리포트용) |
| `payment_status` | VARCHAR | PENDING / DONE / CANCELED / FAILED |
| `payment_type` | VARCHAR | MANUAL / AUTO_RENEWAL |
| `payment_method` | VARCHAR NULL | 결제 수단 |
| `approved_at` | TIMESTAMPTZ NULL | Toss 승인 시각 |
| `created_at` | TIMESTAMPTZ | 생성 시각 |

### Refund (refunds 테이블)
| 필드 | 타입 | 설명 |
|---|---|---|
| `refund_id` | BIGSERIAL PK | 환불 고유 ID |
| `payment_id` | UUID FK | 연결 결제 건 |
| `admin_id` | BIGINT FK NULL | 처리 관리자 (PENDING 시 NULL) |
| `amount` | INT | 환불 금액 |
| `reason` | TEXT | 환불 사유 |
| `refund_status` | VARCHAR | PENDING / COMPLETED / FAILED / REJECTED |
| `reject_reason` | TEXT NULL | 환불 불가 사유 (REJECTED 시 필수) |
| `refunded_at` | TIMESTAMPTZ NULL | 환불 완료 시각 (COMPLETED 시 필수) |
| `created_at` | TIMESTAMPTZ | 생성 시각 |

---

## 환불 정책 (Business Rules)

### 전액 환불 조건 (AND 조건)
1. 결제일 포함 **7일 이내**
2. 유료 AI 기능 **미이용** — 이력서 분석 유료 이용 0회 AND AI 면접 유료 이용 0회

### 환불 불가 조건 (OR 조건)
- 결제일 포함 7일 초과
- 이력서 분석 유료 이용 1회 이상
- AI 면접 유료 이용 1회 이상

### 처리 흐름
```
회원 환불 요청
  → refunds 레코드 생성 (refund_status: PENDING)
  → CS 관리자 확인
      ├── 조건 충족 → 환불 처리 확정
      │     → Toss 환불 API 호출
      │     → refund_status: COMPLETED, refunded_at 기록
      │     → payment_status: CANCELED
      └── 조건 미충족 → 환불 불가 처리
            → refund_status: REJECTED, reject_reason 기록
            → payment_status 유지 (DONE)
```

---

## Success Criteria

- **SC-001**: 결제 내역 목록 조회 응답 1초 이하
- **SC-002**: 환불 가능 여부 검증 로직이 결제일 / AI 이용 여부 두 조건을 모두 정확히 판단한다.
- **SC-003**: 환불 처리 확정 후 `payment_status`가 `CANCELED`로 변경되고 목록에 즉시 반영된다.
- **SC-004**: 환불 불가 처리 후 `refund_status`가 `REJECTED`로 변경되고 목록 뱃지가 "환불 불가"로 표시된다.
- **SC-005**: `AT_RISK` 구독자는 가장 최근 `AUTO_RENEWAL FAILED` 결제 기준으로 정확히 산출된다.

---

## Assumptions

- 결제 PG는 Toss Payments 단일 연동 기준
- 부분 환불 없음 — 전액 환불만 처리
- 환불 금액 = `payments.amount` 전액
- `supply_amount`, `vat`는 정산 리포트 v2 구현 시 활용 예정 (v1 범위 외)
- 정산 리포트(매출 집계, 세금계산서 등) 기능은 v2 예정
- 구독 플랜은 현재 "프리미엄 월정액" 단일 플랜
- B2B 기업 구독, 연정액 플랜은 v1 범위 외
