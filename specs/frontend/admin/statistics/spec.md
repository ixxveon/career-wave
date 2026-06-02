# Feature Specification: 서비스 통계 및 분석 (Statistics)

**Feature Branch**: `feature/admin-statistics-fe-spec`
**버전**: v1
**Status**: UI 구현 완료 — API 연동 예정
**담당**: 신보라

---

## 도메인 개요

CareerWave 서비스의 매출 현황과 가입자 증가 추이를 관리자가 한눈에 파악할 수 있는 어드민 통계 페이지.
별도 탭 없는 단일 페이지 구조이며, 모든 데이터는 `payments`, `subscriptions`, `members` 테이블 기반으로 집계한다.

---

## User Stories & Acceptance Scenarios

### Story 1 — KPI 집계 확인 (Priority: P1)

> 관리자는 서비스의 핵심 지표를 한눈에 파악할 수 있다.

**Acceptance Scenarios**:
1. **Given** 관리자 로그인, **When** 통계 페이지 진입, **Then** KPI 카드 4종이 표시된다.
   - 이번 달 매출: 당월 `payment_status = DONE` 합산 금액 + 전월 대비 증감률
   - 누적 총 매출: 전체 `payment_status = DONE` 합산 금액
   - 총 가입자 수: 전체 회원 수
   - 이번 달 신규 가입: 당월 신규 가입자 수 + 전월 대비 증감률

---

### Story 2 — 월별 매출 추이 확인 (Priority: P1)

> 관리자는 최근 6개월 월별 매출 흐름을 차트로 확인할 수 있다.

**Acceptance Scenarios**:
1. **Given** 통계 페이지, **When** 진입, **Then** 최근 6개월 월별 매출 꺾은선 차트가 표시된다.
2. **Given** 차트, **When** 최고 매출 월 확인, **Then** 피크 포인트에 툴팁이 표시된다.

---

### Story 3 — 구독 유형별 매출 실적 확인 (Priority: P1)

> 관리자는 이번 달 구독 유형별 매출 기여도를 확인할 수 있다.

**Acceptance Scenarios**:
1. **Given** 통계 페이지, **When** 진입, **Then** 구독 유형별 매출 실적 목록이 표시된다.
   - 프리미엄 월정액 / 신규 가입 전환 / 갱신 결제 / 환불 차감
   - 각 항목별 매출액 + 전월 대비 증감률

---

### Story 4 — 구독자 변동 추이 확인 (Priority: P1)

> 관리자는 최근 6개월 신규 구독자와 탈퇴 구독자 추이를 비교할 수 있다.

**Acceptance Scenarios**:
1. **Given** 통계 페이지, **When** 진입, **Then** 신규 구독자 vs 탈퇴 구독자 이중 꺾은선 차트가 표시된다.
2. **Given** 차트 우상단 범례, **When** 확인, **Then** 이번 달 신규/탈퇴 수가 표시된다.

---

### Story 5 — 최근 가입 피드 확인 (Priority: P1)

> 관리자는 최근 구독/가입 활동을 피드 형태로 확인할 수 있다.

**Acceptance Scenarios**:
1. **Given** 통계 페이지, **When** 진입, **Then** 최근 가입 피드 5건이 표시된다.
   - 회원 이니셜 아바타 / 이름 / 구독 상태 / 플랜명 / 경과 시간

---

## Functional Requirements

- **FR-001**: KPI 집계 — 이번 달 매출(전월 대비 증감률), 누적 총 매출, 총 가입자 수, 이번 달 신규 가입(전월 대비 증감률)
- **FR-002**: 월별 매출 추이 — 최근 6개월 월별 `payment_status = DONE` 합산, 피크 포인트 툴팁
- **FR-003**: 구독 유형별 매출 실적 — 프리미엄 월정액 / 신규 가입 전환 / 갱신 결제 / 환불 차감, 전월 대비 증감률
- **FR-004**: 구독자 변동 추이 — 최근 6개월 신규 구독자 수 vs 탈퇴 구독자 수
- **FR-005**: 최근 가입 피드 — 최근 5건 구독/가입 활동 목록

---

## Key Entities (참조)

### payments (참조)

| 필드 | 설명 |
|---|---|
| `payment_status` | `DONE` 건만 매출 집계 대상 |
| `payment_type` | `MANUAL`(신규) / `AUTO_RENEWAL`(갱신) 분류 |
| `amount` | 결제 금액 |
| `created_at` | 월별 집계 기준 |

### subscriptions (참조)

| 필드 | 설명 |
|---|---|
| `sub_status` | `ACTIVE` / `CANCEL_SCHEDULED` 등 |
| `start_date` | 신규 가입 기준 |
| `renew_date` | 탈퇴 기준 |

### members (참조)

| 필드 | 설명 |
|---|---|
| `member_id` | 총 가입자 수 집계 |
| `created_at` | 월별 신규 가입 집계 기준 |

---

## Success Criteria

- **SC-001**: 페이지 진입 시 KPI·차트·피드 전체 렌더링 2초 이하
- **SC-002**: 월별 매출 차트가 최근 6개월 데이터를 정확히 표시한다
- **SC-003**: 구독자 변동 추이 차트가 신규·탈퇴 두 계열을 구분하여 표시한다

---

## Assumptions

- 통계 페이지는 단일 페이지 구조 (탭 없음)
- 모든 금액은 원화(KRW) 기준
- 차트 라이브러리 없이 SVG 직접 구현 (현재 UI 기준)
- 최근 가입 피드 "전체보기" 버튼은 v2 예정
