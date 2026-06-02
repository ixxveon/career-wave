# Spec: 서비스 통계 및 분석 API (Statistics)

**Feature Branch**: `feature/admin-statistics-be-spec`
**버전**: v1
**Status**: 스펙 완료
**담당**: 신보라

---

## 도메인 개요

CareerWave 서비스의 매출 현황과 가입자 증가 추이를 집계하여 어드민에 제공하는 READ-ONLY REST API.
별도 Entity 없이 `payments`, `subscriptions`, `members` 테이블을 집계·조인하여 반환한다.
쓰기 작업 없음 — 모든 엔드포인트는 GET 조회 전용.

---

## ERD (참조 테이블)

### payments (집계 대상)

| 컬럼 | 집계 활용 |
|---|---|
| `payment_status` | `DONE` 건만 매출 집계 대상 |
| `payment_type` | `MANUAL`(신규) / `AUTO_RENEWAL`(갱신) 분류 |
| `amount` | 매출 금액 합산 |
| `created_at` | 월별 집계 기준 |

### subscriptions (집계 대상)

| 컬럼 | 집계 활용 |
|---|---|
| `sub_status` | 구독 상태 |
| `start_date` | 신규 구독자 월별 집계 기준 |
| `renew_date` | 탈퇴(만료) 집계 기준 |
| `created_at` | 최근 가입 피드 정렬 기준 |

### members (집계 대상)

| 컬럼 | 집계 활용 |
|---|---|
| `member_id` | 총 가입자 수 COUNT |
| `created_at` | 월별 신규 가입 집계 기준 |

### refunds (집계 대상)

| 컬럼 | 집계 활용 |
|---|---|
| `refund_status` | `COMPLETED` 건만 환불 차감 대상 |
| `amount` | 환불 차감 금액 합산 |
| `created_at` | 당월 환불 집계 기준 |

---

## 패키지 구조

```text
admin/statistics/
├── service/
│   └── AdminStatisticsService.java
├── controller/
│   └── AdminStatisticsController.java
├── dto/
│   └── StatisticsDTO.java
└── docs/
    └── AdminStatisticsControllerDocs.java
```

> Entity, Repository 없음 — `PaymentRepository`, `SubscriptionRepository`, `MemberRepository`(admin 전용) JPQL/QueryDSL로 집계.
> `user/` 패키지 클래스 직접 참조 금지 (CONVENTION.md).

---

## DTO 구조

### StatisticsDTO.java

```java
public class StatisticsDTO {

    // KPI 집계
    public record ResponseSummary(
        long currentMonthRevenue,          // 이번 달 매출 (DONE 합산)
        double currentMonthRevenueGrowth,  // 전월 대비 증감률 (%)
        long totalRevenue,                 // 누적 총 매출
        long totalMembers,                 // 총 가입자 수
        long currentMonthNewMembers,       // 이번 달 신규 가입
        double currentMonthNewMembersGrowth // 전월 대비 증감률 (%)
    ) {}

    // 월별 매출 항목
    public record MonthlyRevenue(
        String month,   // "YYYY-MM" 형식
        long total      // 해당 월 DONE 합산 금액
    ) {}

    // 구독 유형별 매출 항목
    public record RevenueBreakdownItem(
        String type,    // PREMIUM / NEW_CONVERSION / RENEWAL / REFUND_DEDUCTION
        String label,
        long amount,    // 환불 차감은 음수
        double growth   // 전월 대비 증감률 (%)
    ) {}

    // 구독자 변동 항목 (월별)
    public record MonthlySubscribers(
        String month,
        long newSubs,   // 신규 구독자 수
        long churned    // 탈퇴(만료) 구독자 수
    ) {}

    // 최근 가입 피드 항목
    public record RecentSubscriber(
        String memberId,
        String initials,     // 이름 이니셜 2자
        String memberName,
        String subStatus,
        String plan,
        String timeAgo       // "N분 전" 포맷
    ) {}
}
```

---

## API 명세

### KPI 집계

```http
GET /api/admin/statistics/summary
응답: ApiResponse<StatisticsDTO.ResponseSummary>
```

**집계 로직**:
- `currentMonthRevenue`: 당월 `payment_status = DONE` AND `amount` SUM
- `currentMonthRevenueGrowth`: (당월 매출 - 전월 매출) / 전월 매출 × 100. **전월 매출이 0이면 0.0 반환** (0 나누기 방지)
- `totalRevenue`: 전체 `payment_status = DONE` AND `amount` SUM
- `totalMembers`: `members` 테이블 COUNT
- `currentMonthNewMembers`: 당월 `members.created_at` COUNT
- `currentMonthNewMembersGrowth`: (당월 신규 - 전월 신규) / 전월 신규 × 100. **전월 신규 가입이 0이면 0.0 반환** (0 나누기 방지)

---

### 월별 매출 추이

```http
GET /api/admin/statistics/revenue/monthly
응답: ApiResponse<List<StatisticsDTO.MonthlyRevenue>>
```

**집계 로직**:
- 최근 6개월 (당월 포함), 오래된 순 정렬
- 월별 `payment_status = DONE` `amount` SUM
- 데이터 없는 월은 `total: 0` 반환

---

### 구독 유형별 매출 실적

```http
GET /api/admin/statistics/revenue/breakdown
응답: ApiResponse<List<StatisticsDTO.RevenueBreakdownItem>>
```

**집계 로직 (당월 기준)**:
- `PREMIUM`: `payment_type = MANUAL` OR `AUTO_RENEWAL` 전체 DONE 합산
- `NEW_CONVERSION`: `payment_type = MANUAL` DONE 합산 (신규 가입 전환)
- `RENEWAL`: `payment_type = AUTO_RENEWAL` DONE 합산
- `REFUND_DEDUCTION`: `refund_status = COMPLETED` `amount` SUM (음수 반환)
- 각 유형별 전월 대비 증감률 포함

---

### 구독자 변동 추이

```http
GET /api/admin/statistics/subscribers/monthly
응답: ApiResponse<List<StatisticsDTO.MonthlySubscribers>>
```

**집계 로직**:
- 최근 6개월 (당월 포함), 오래된 순 정렬
- `newSubs`: 월별 `subscriptions.start_date` 기준 신규 COUNT
- `churned`: 월별 `subscriptions.renew_date` 만료 기준 탈퇴 COUNT
- 데이터 없는 월은 `newSubs: 0, churned: 0` 반환

---

### 최근 가입 피드

```http
GET /api/admin/statistics/subscribers/recent
응답: ApiResponse<List<StatisticsDTO.RecentSubscriber>>
```

**집계 로직**:
- `subscriptions.created_at DESC` 상위 5건
- `members` 테이블 JOIN → `memberName` 조회
- `timeAgo`: 서버에서 현재 시각 기준 경과 시간 포맷 ("N분 전", "N시간 전", "N일 전")

---

## 서비스 로직

### AdminStatisticsService

#### getSummary()
- 당월·전월 매출 집계 → 증감률 계산
- 당월·전월 신규 가입 집계 → 증감률 계산
- 누적 매출, 총 가입자 수 집계
- 반환: `StatisticsDTO.ResponseSummary`

#### getMonthlyRevenue()
- 최근 6개월 월별 매출 GROUP BY YEAR·MONTH
- 누락 월 0 채움 처리
- 반환: `List<StatisticsDTO.MonthlyRevenue>` (오래된 순)

#### getRevenueBreakdown()
- 당월 구독 유형별 집계 + 전월 대비 증감률
- 반환: `List<StatisticsDTO.RevenueBreakdownItem>` (PREMIUM→NEW_CONVERSION→RENEWAL→REFUND_DEDUCTION 순)

#### getMonthlySubscribers()
- 최근 6개월 월별 신규·탈퇴 GROUP BY YEAR·MONTH
- 누락 월 0 채움 처리
- 반환: `List<StatisticsDTO.MonthlySubscribers>` (오래된 순)

#### getRecentSubscribers()
- 최근 구독 5건 조회 + members JOIN
- 경과 시간 포맷 처리
- 반환: `List<StatisticsDTO.RecentSubscriber>`

---

## ErrorCode

| ErrorCode | HTTP | 발생 시점 |
|---|---|---|
| `UNAUTHORIZED` | 401 | 인증 실패 |
