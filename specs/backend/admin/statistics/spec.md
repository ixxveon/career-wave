# Spec: 서비스 통계 및 분석 API (Statistics)

**Feature Branch**: `feature/admin-statistics-be-spec`
**버전**: v1
**Status**: 스펙 완료
**담당**: 신보라

---

## 도메인 개요

CareerWave 서비스의 매출 현황과 가입자 증가 추이를 집계하여 어드민에 제공하는 READ-ONLY REST API.
별도 Entity 없이 payments, subscriptions, members 테이블을 집계·조인하여 반환한다.
쓰기 작업 없음 — 모든 엔드포인트는 GET 조회 전용.

---

## User Stories

### Story 1 — KPI 요약 조회 (P1)

**As** 관리자
**I want** 이번 달 매출과 신규 가입자 수를 한눈에 보고 싶다
**So that** 서비스 현황을 빠르게 파악하고 운영 의사결정에 활용할 수 있다

**Scenario 1**: 정상 조회
- Given 당월과 전월에 DONE 결제 건이 존재할 때
- When GET /api/v1/admin/statistics/summary 요청 시
- Then 당월 매출, 전월 대비 증감률, 누적 매출, 총 가입자 수, 당월 신규 가입, 신규 가입 증감률을 반환한다

**Scenario 2**: 전월 데이터 없음
- Given 전월 매출이 0일 때
- When GET /api/v1/admin/statistics/summary 요청 시
- Then 증감률은 0.0으로 반환한다 (0 나누기 방지)

**Scenario 3**: 인증 실패
- Given 유효하지 않은 토큰으로 요청 시
- When GET /api/v1/admin/statistics/summary 요청 시
- Then 401 UNAUTHORIZED를 반환한다

---

### Story 2 — 월별 매출 추이 조회 (P1)

**As** 관리자
**I want** 최근 6개월간 월별 매출 추이를 차트로 보고 싶다
**So that** 매출 흐름을 파악하고 이상 징후를 감지할 수 있다

**Scenario 1**: 정상 조회
- Given 최근 6개월 중 일부 월에만 결제 데이터가 존재할 때
- When GET /api/v1/admin/statistics/revenue/monthly 요청 시
- Then 데이터 없는 월은 total: 0으로 채워 6개월 전체를 오래된 순으로 반환한다

**Scenario 2**: 전체 데이터 없음
- Given 최근 6개월간 DONE 결제 건이 하나도 없을 때
- When GET /api/v1/admin/statistics/revenue/monthly 요청 시
- Then 6개월 전체를 total: 0으로 채워 반환한다

---

### Story 3 — 구독 유형별 매출 실적 조회 (P1)

**As** 관리자
**I want** 이번 달 구독 유형별 매출을 보고 싶다
**So that** 매출 구성 비율과 전월 대비 변화를 파악할 수 있다

**Scenario 1**: 정상 조회
- Given 당월 MANUAL, AUTO_RENEWAL, 환불 데이터가 존재할 때
- When GET /api/v1/admin/statistics/revenue/breakdown 요청 시
- Then PREMIUM, NEW_CONVERSION, RENEWAL, REFUND_DEDUCTION 순서로 반환하며 환불은 음수로 반환한다

**Scenario 2**: 환불 데이터 없음
- Given 당월 COMPLETED 환불 건이 없을 때
- When GET /api/v1/admin/statistics/revenue/breakdown 요청 시
- Then REFUND_DEDUCTION amount는 0으로 반환한다

---

### Story 4 — 구독자 변동 추이 조회 (P1)

**As** 관리자
**I want** 최근 6개월간 신규 구독자와 탈퇴 구독자 추이를 보고 싶다
**So that** 구독자 증감 패턴을 파악하고 이탈 방지 전략을 수립할 수 있다

**Scenario 1**: 정상 조회
- Given 최근 6개월 구독 데이터가 존재할 때
- When GET /api/v1/admin/statistics/subscribers/monthly 요청 시
- Then 월별 신규, 탈퇴 수를 오래된 순으로 반환하며 누락 월은 0으로 채운다

---

### Story 5 — 최근 가입 피드 조회 (P2)

**As** 관리자
**I want** 최근 구독한 회원 목록을 실시간으로 확인하고 싶다
**So that** 신규 가입 현황을 모니터링할 수 있다

**Scenario 1**: 정상 조회
- Given 구독 데이터가 5건 이상 존재할 때
- When GET /api/v1/admin/statistics/subscribers/recent 요청 시
- Then 최신 순 상위 5건을 timeAgo 포맷과 함께 반환한다

**Scenario 2**: 데이터 5건 미만
- Given 구독 데이터가 3건만 존재할 때
- When GET /api/v1/admin/statistics/subscribers/recent 요청 시
- Then 존재하는 3건만 반환한다

---

## Functional Requirements

- FR-001: KPI 요약 API는 당월 매출, 전월 대비 증감률, 누적 총 매출, 총 가입자 수, 당월 신규 가입, 신규 가입 증감률을 반환해야 한다
- FR-002: 증감률 계산 시 전월 값이 0이면 증감률은 0.0을 반환해야 한다
- FR-003: 매출 집계는 payment_status = DONE 건만 대상으로 해야 한다
- FR-004: 환불 차감은 refund_status = COMPLETED 건만 집계해야 한다
- FR-005: 월별 매출 추이는 최근 6개월을 오래된 순으로 반환해야 한다
- FR-006: 데이터가 없는 월은 0으로 채워 반환해야 한다
- FR-007: 구독 유형별 매출은 PREMIUM, NEW_CONVERSION, RENEWAL, REFUND_DEDUCTION 순서로 반환해야 한다
- FR-008: REFUND_DEDUCTION amount는 음수로 반환해야 한다
- FR-009: 구독자 변동 추이는 최근 6개월을 오래된 순으로 반환해야 한다
- FR-010: 최근 가입 피드는 최대 5건, 최신 순으로 반환해야 한다
- FR-011: timeAgo는 서버에서 Asia/Seoul 기준으로 계산하여 반환해야 한다
- FR-012: 모든 응답은 ApiResponse<T> 래퍼를 사용해야 한다
- FR-013: user/ 패키지 클래스를 직접 참조하지 않고 admin 전용 집계 쿼리를 사용해야 한다
- FR-014: 모든 엔드포인트는 GET 전용이어야 한다

---

## Edge Cases

- EC-001: 전월 매출이 0일 때 증감률 → 0.0 반환
- EC-002: 전월 신규 가입이 0일 때 증감률 → 0.0 반환
- EC-003: 최근 6개월 전체에 데이터가 없을 때 → 모든 월 0으로 채워 반환
- EC-004: 최근 가입 피드 데이터가 5건 미만일 때 → 존재하는 건수만 반환
- EC-005: 당월 환불 데이터가 없을 때 → REFUND_DEDUCTION amount: 0 반환
- EC-006: amount 합산 결과 타입이 Long 범위 내인지 검증 필요
- EC-007: timeAgo 계산 시 Asia/Seoul 기준으로 처리하며 클라이언트 타임존에 의존하지 않아야 한다

---

## ERD (참조 테이블)

### payments

| 컬럼 | 집계 활용 |
|---|---|
| payment_status | DONE 건만 매출 집계 대상 |
| payment_type | MANUAL(신규) / AUTO_RENEWAL(갱신) 분류 |
| amount | 매출 금액 합산 |
| created_at | 월별 집계 기준 |

### subscriptions

| 컬럼 | 집계 활용 |
|---|---|
| sub_status | 구독 상태 |
| start_date | 신규 구독자 월별 집계 기준 |
| renew_date | 탈퇴(만료) 집계 기준 |
| created_at | 최근 가입 피드 정렬 기준 |

### members

| 컬럼 | 집계 활용 |
|---|---|
| member_id | 총 가입자 수 COUNT |
| created_at | 월별 신규 가입 집계 기준 |

### refunds

| 컬럼 | 집계 활용 |
|---|---|
| refund_status | COMPLETED 건만 환불 차감 대상 |
| amount | 환불 차감 금액 합산 |
| created_at | 당월 환불 집계 기준 |

---

## 패키지 구조

```text
admin/statistics/
├── service/
│   ├── AdminStatisticsService.java
│   └── impl/
│       └── AdminStatisticsServiceImpl.java
├── controller/
│   └── AdminStatisticsController.java
├── dto/
│   └── StatisticsDTO.java
└── docs/
    └── AdminStatisticsControllerDocs.java
```

---

## Success Criteria

- SC-001: 전월 값이 0일 때 증감률이 0.0으로 반환된다
- SC-002: 데이터 없는 월이 0으로 채워져 항상 6개월 전체가 반환된다
- SC-003: 환불 amount가 음수로 반환된다
- SC-004: 최근 가입 피드가 최대 5건 이내로 반환된다
- SC-005: timeAgo가 Asia/Seoul 기준으로 계산되어 반환된다
- SC-006: 모든 응답이 ApiResponse<T> 래퍼로 감싸진다
- SC-007: 인증 실패 시 401이 반환된다

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| UNAUTHORIZED | 401 | 인증 실패 |
