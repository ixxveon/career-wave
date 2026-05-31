# Tasks: 서비스 통계 및 분석 (Statistics)

> `plan.md`의 Phase와 1:1 대응한다.
> UI 구현 완료 항목은 ✅, API 연동 예정 항목은 [ ] 표시.

---

## Phase 1~6 — UI 구현 ✅ 완료

### 타입 / 인터페이스

```ts
// API 연동 시 frontend/src/admin/api/statsApi.ts로 이동 예정

interface StatsSummary {
  currentMonthRevenue: number;
  currentMonthRevenueGrowth: number;
  totalRevenue: number;
  totalMembers: number;
  currentMonthNewMembers: number;
  currentMonthNewMembersGrowth: number;
}

interface MonthlyRevenue {
  month: string;   // "YYYY-MM"
  total: number;
}

interface RevenueBreakdownItem {
  type: 'PREMIUM' | 'NEW_CONVERSION' | 'RENEWAL' | 'REFUND_DEDUCTION';
  label: string;
  amount: number;
  growth: number;
}

interface MonthlySubscribers {
  month: string;
  newSubs: number;
  churned: number;
}

interface RecentSubscriber {
  memberId: string;
  initials: string;
  memberName: string;
  subStatus: string;
  plan: string;
  timeAgo: string;
}
```

### 더미 데이터 (현재 컴포넌트 내부 상수)

```ts
// 현재 StatisticsPage.tsx 내부에 선언된 더미 데이터
// API 연동 시 statsApi.ts 호출로 교체

const kpis = [
  { label: '이번 달 매출',      value: '₩38.5M',  sub: '전월 대비 +12.6%' },
  { label: '누적 총 매출',      value: '₩186.5M', sub: '서비스 오픈 이후'  },
  { label: '총 가입자 수',      value: '12,847명', sub: '서비스 오픈 이후'  },
  { label: '이번 달 신규 가입', value: '314명',    sub: '전월 대비 +2.3%'  },
];

const monthlyRevenue: MonthlyRevenue[] = [...]; // 최근 6개월
const subscriptionBreakdown: RevenueBreakdownItem[] = [...];
const monthlySubscribers: MonthlySubscribers[] = [...]; // 최근 6개월
const recentActivity: RecentSubscriber[] = [...]; // 5건
```

---

## Phase 7 — API 연동

### statsApi.ts 작성

```ts
// frontend/src/admin/api/statsApi.ts
import axiosInstance from '@/utils/axiosInstance';

// KPI 집계 — 반환: ApiResponse<StatsSummary>.data
export const fetchStatsSummary = (): Promise<StatsSummary> =>
  axiosInstance.get('/api/admin/statistics/summary').then(r => r.data.data);

// 월별 매출 추이 — 반환: ApiResponse<MonthlyRevenue[]>.data
export const fetchMonthlyRevenue = (): Promise<MonthlyRevenue[]> =>
  axiosInstance.get('/api/admin/statistics/revenue/monthly').then(r => r.data.data);

// 구독 유형별 매출 실적 — 반환: ApiResponse<RevenueBreakdownItem[]>.data
export const fetchRevenueBreakdown = (): Promise<RevenueBreakdownItem[]> =>
  axiosInstance.get('/api/admin/statistics/revenue/breakdown').then(r => r.data.data);

// 구독자 변동 추이 — 반환: ApiResponse<MonthlySubscribers[]>.data
export const fetchMonthlySubscribers = (): Promise<MonthlySubscribers[]> =>
  axiosInstance.get('/api/admin/statistics/subscribers/monthly').then(r => r.data.data);

// 최근 가입 피드 — 반환: ApiResponse<RecentSubscriber[]>.data
export const fetchRecentSubscribers = (): Promise<RecentSubscriber[]> =>
  axiosInstance.get('/api/admin/statistics/subscribers/recent').then(r => r.data.data);
```

### API 연동 체크리스트

- [ ] `statsApi.ts` 파일 작성
- [ ] KPI 집계 API 연동 및 더미 데이터 교체 (`GET /api/admin/statistics/summary`)
  - [ ] 이번 달 매출 + 전월 대비 증감률 표시
  - [ ] 누적 총 매출 표시
  - [ ] 총 가입자 수 표시
  - [ ] 이번 달 신규 가입 + 전월 대비 증감률 표시
- [ ] 월별 매출 추이 API 연동 및 더미 데이터 교체 (`GET /api/admin/statistics/revenue/monthly`)
  - [ ] SVG 차트 데이터 소스를 API 응답으로 교체
  - [ ] X축 레이블을 API 응답 `month` 필드로 교체
- [ ] 구독 유형별 매출 실적 API 연동 및 더미 데이터 교체 (`GET /api/admin/statistics/revenue/breakdown`)
- [ ] 구독자 변동 추이 API 연동 및 더미 데이터 교체 (`GET /api/admin/statistics/subscribers/monthly`)
  - [ ] 신규 / 탈퇴 SVG 차트 데이터 소스를 API 응답으로 교체
  - [ ] 이번 달 신규/탈퇴 수 범례 API 응답 기준으로 표시
- [ ] 최근 가입 피드 API 연동 및 더미 데이터 교체 (`GET /api/admin/statistics/subscribers/recent`)
- [ ] `ApiResponse<T>` 형식 기반 성공·실패 처리 (`r.data.data` 언랩)
- [ ] API 실패 시 에러 메시지 표시
- [ ] API 호출 중 로딩 상태(스피너) 표시
