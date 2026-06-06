import axiosInstance from '../../utils/axiosInstance';
import type { ApiResponse } from './types';

export const DASHBOARD_API_BASE_PATH = '/api/v1/admin/dashboard';

export const DASHBOARD_RANGE = {
  TODAY: 'TODAY',
  SEVEN_DAYS: '7D',
  THIRTY_DAYS: '30D',
} as const;

export type DashboardRange = (typeof DASHBOARD_RANGE)[keyof typeof DASHBOARD_RANGE];

export interface DashboardSummaryParams {
  range?: DashboardRange;
}

export interface DashboardKpi {
  key: string;
  title: string;
  value: number;
  unit: string;
  deltaText: string;
  severity: string;
  targetPath: string;
}

export interface DashboardAlert {
  id: number;
  level: string;
  domain: string;
  title: string;
  message: string;
  targetPath: string;
  createdAt: string;
}

export interface DashboardActivity {
  id: number;
  occurredAt: string;
  adminId: string;
  message: string;
  targetPath: string;
}

export interface AdminDashboardSummary {
  baseDateTime: string;
  kpis: DashboardKpi[];
  alerts: DashboardAlert[];
  weeklySignups: Array<{
    label: string;
    count: number;
  }>;
  paymentRatio: Array<{
    method: string;
    label: string;
    ratio: number;
  }>;
  serviceCards: Array<{
    key: string;
    title: string;
    description: string;
    summaryText: string;
    targetPath: string;
  }>;
  systemStatus: Array<{
    key: string;
    label: string;
    status: string;
    valueText: string;
  }>;
  recentActivities: DashboardActivity[];
}

export function unwrapDashboardSummaryResponse(response: ApiResponse<AdminDashboardSummary>) {
  return response.data;
}

export function getDashboardSummaryErrorMessage(message?: string | null) {
  return message?.trim() || '대시보드 요약 조회에 실패했습니다.';
}

export const dashboardApi = {
  getSummary: (params?: DashboardSummaryParams) =>
    axiosInstance.get<ApiResponse<AdminDashboardSummary>>(`${DASHBOARD_API_BASE_PATH}/summary`, { params }),
};

export { axiosInstance };
