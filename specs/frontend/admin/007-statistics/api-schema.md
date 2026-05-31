# API Schema: 서비스 통계 및 분석 (Statistics)

> 백엔드 ↔ 프론트엔드 간 데이터 계약.
> 모든 HTTP 호출은 `frontend/src/admin/api/statsApi.ts`를 통해서만 수행한다.

---

## Interfaces

```ts
// KPI 집계
interface StatsSummary {
  currentMonthRevenue: number;      // 이번 달 매출 (DONE 합산)
  currentMonthRevenueGrowth: number; // 전월 대비 증감률 (%)
  totalRevenue: number;              // 누적 총 매출
  totalMembers: number;              // 총 가입자 수
  currentMonthNewMembers: number;    // 이번 달 신규 가입
  currentMonthNewMembersGrowth: number; // 전월 대비 증감률 (%)
}

// 월별 매출
interface MonthlyRevenue {
  month: string;   // "YYYY-MM" 형식
  total: number;   // 해당 월 매출 합산 (DONE 기준)
}

// 구독 유형별 매출 실적
interface RevenueBreakdownItem {
  type: 'PREMIUM' | 'NEW_CONVERSION' | 'RENEWAL' | 'REFUND_DEDUCTION';
  label: string;   // 표시 이름
  amount: number;  // 매출액 (환불 차감은 음수)
  growth: number;  // 전월 대비 증감률 (%)
}

// 구독자 변동 (월별)
interface MonthlySubscribers {
  month: string;    // "YYYY-MM" 형식
  newSubs: number;  // 신규 구독자 수
  churned: number;  // 탈퇴 구독자 수
}

// 최근 가입 피드
interface RecentSubscriber {
  memberId: string;
  initials: string;   // 이름 이니셜 (2자)
  memberName: string;
  subStatus: string;  // ACTIVE / PENDING 등
  plan: string;       // 플랜명
  timeAgo: string;    // "N분 전" 형식 (서버에서 포맷)
}
```

---

## API 목록

### KPI 집계

```http
GET /api/admin/statistics/summary
응답: ApiResponse<StatsSummary>
```

**응답 예시**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "요청이 성공했습니다.",
  "data": {
    "currentMonthRevenue": 38500000,
    "currentMonthRevenueGrowth": 12.6,
    "totalRevenue": 186500000,
    "totalMembers": 12847,
    "currentMonthNewMembers": 314,
    "currentMonthNewMembersGrowth": 2.3
  }
}
```

---

### 월별 매출 추이

```http
GET /api/admin/statistics/revenue/monthly
응답: ApiResponse<MonthlyRevenue[]>
```

> 최근 6개월 (당월 포함), 오래된 순 정렬

**응답 예시**:
```json
{
  "data": [
    { "month": "2025-12", "total": 24800000 },
    { "month": "2026-01", "total": 27500000 },
    { "month": "2026-05", "total": 38500000 }
  ]
}
```

---

### 구독 유형별 매출 실적

```http
GET /api/admin/statistics/revenue/breakdown
응답: ApiResponse<RevenueBreakdownItem[]>
```

> 당월 기준, 항목 순서: PREMIUM → NEW_CONVERSION → RENEWAL → REFUND_DEDUCTION

---

### 구독자 변동 추이

```http
GET /api/admin/statistics/subscribers/monthly
응답: ApiResponse<MonthlySubscribers[]>
```

> 최근 6개월 (당월 포함), 오래된 순 정렬

---

### 최근 가입 피드

```http
GET /api/admin/statistics/subscribers/recent
응답: ApiResponse<RecentSubscriber[]>
```

> 최대 5건, 최신 순 정렬
