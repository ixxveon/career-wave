import axiosInstance from '../../utils/axiosInstance';

// ── 타입 ───────────────────────────────────────────────────────

export const REVENUE_TYPE = {
  PREMIUM: 'PREMIUM',
  NEW_CONVERSION: 'NEW_CONVERSION',
  RENEWAL: 'RENEWAL',
  REFUND_DEDUCTION: 'REFUND_DEDUCTION',
} as const;

export const SUB_STATUS = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  CANCELLED: 'CANCELLED',
} as const;

export type RevenueType = typeof REVENUE_TYPE[keyof typeof REVENUE_TYPE];
export type SubStatus = typeof SUB_STATUS[keyof typeof SUB_STATUS];

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface StatsSummary {
  currentMonthRevenue: number;
  currentMonthRevenueGrowth: number;
  totalRevenue: number;
  totalMembers: number;
  currentMonthNewMembers: number;
  currentMonthNewMembersGrowth: number;
}

export interface MonthlyRevenue {
  month: string; // "YYYY-MM"
  total: number;
}

export interface RevenueBreakdownItem {
  type: RevenueType;
  label: string;
  amount: number;
  growth: number;
}

export interface MonthlySubscribers {
  month: string; // "YYYY-MM"
  newSubs: number;
  churned: number;
}

export interface RecentSubscriber {
  memberId: string;
  initials: string;
  memberName: string;
  subStatus: SubStatus;
  plan: string;
  timeAgo: string;
}

// ── API 함수 ───────────────────────────────────────────────────

export const statsApi = {
  // KPI 집계
  getSummary: () =>
    axiosInstance.get<ApiResponse<StatsSummary>>('/api/v1/admin/statistics/summary'),

  // 월별 매출 추이
  getMonthlyRevenue: () =>
    axiosInstance.get<ApiResponse<MonthlyRevenue[]>>('/api/v1/admin/statistics/revenue/monthly'),

  // 구독 유형별 매출 실적
  getRevenueBreakdown: () =>
    axiosInstance.get<ApiResponse<RevenueBreakdownItem[]>>('/api/v1/admin/statistics/revenue/breakdown'),

  // 구독자 변동 추이
  getMonthlySubscribers: () =>
    axiosInstance.get<ApiResponse<MonthlySubscribers[]>>('/api/v1/admin/statistics/subscribers/monthly'),

  // 최근 가입 피드
  getRecentSubscribers: () =>
    axiosInstance.get<ApiResponse<RecentSubscriber[]>>('/api/v1/admin/statistics/subscribers/recent'),
};
