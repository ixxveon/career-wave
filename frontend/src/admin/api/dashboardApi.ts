import axiosInstance from '../../utils/axiosInstance';
import type { AxiosResponse } from 'axios';
import type { ApiResponse } from './types';

export const DASHBOARD_API_BASE_PATH = '/api/v1/admin/dashboard';

export const DASHBOARD_RANGE = {
  TODAY: 'TODAY',
  SEVEN_DAYS: '7D',
  THIRTY_DAYS: '30D',
} as const;

export type DashboardRange = (typeof DASHBOARD_RANGE)[keyof typeof DASHBOARD_RANGE];

export const DASHBOARD_SEVERITY = {
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;

export type DashboardSeverity = (typeof DASHBOARD_SEVERITY)[keyof typeof DASHBOARD_SEVERITY];

export const DASHBOARD_ALERT_LEVEL = {
  URGENT: 'URGENT',
  WARNING: 'WARNING',
  NORMAL: 'NORMAL',
} as const;

export type DashboardAlertLevel = (typeof DASHBOARD_ALERT_LEVEL)[keyof typeof DASHBOARD_ALERT_LEVEL];

export const DASHBOARD_ALERT_DOMAIN = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  REPORT: 'REPORT',
  CS: 'CS',
  PAYMENT: 'PAYMENT',
  STATISTICS: 'STATISTICS',
  AI_METRICS: 'AI_METRICS',
  SCRAPING: 'SCRAPING',
  AUDIT_LOG: 'AUDIT_LOG',
} as const;

export type DashboardAlertDomain = (typeof DASHBOARD_ALERT_DOMAIN)[keyof typeof DASHBOARD_ALERT_DOMAIN];

export const DASHBOARD_PAYMENT_METHOD = {
  CARD: 'CARD',
} as const;

export type DashboardPaymentMethod =
  (typeof DASHBOARD_PAYMENT_METHOD)[keyof typeof DASHBOARD_PAYMENT_METHOD];

export const DASHBOARD_SYSTEM_STATUS = {
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;

export type DashboardSystemStatus = (typeof DASHBOARD_SYSTEM_STATUS)[keyof typeof DASHBOARD_SYSTEM_STATUS];

export interface DashboardSummaryParams {
  range?: DashboardRange;
}

export interface DashboardKpi {
  key: string;
  title: string;
  value: number;
  unit: string;
  deltaText: string;
  severity: DashboardSeverity;
  targetPath: string;
}

export interface DashboardAlert {
  id: number;
  level: DashboardAlertLevel;
  domain: DashboardAlertDomain;
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
    method: DashboardPaymentMethod;
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
    status: DashboardSystemStatus;
    valueText: string;
  }>;
  recentActivities: DashboardActivity[];
}

export type DashboardSummaryError = Error & { statusCode?: number };

export function unwrapDashboardSummaryResponse(
  response: AxiosResponse<ApiResponse<AdminDashboardSummary>>
): AdminDashboardSummary;
export function unwrapDashboardSummaryResponse(response: ApiResponse<AdminDashboardSummary>): AdminDashboardSummary;
export function unwrapDashboardSummaryResponse(
  response: AxiosResponse<ApiResponse<AdminDashboardSummary>> | ApiResponse<AdminDashboardSummary>
): AdminDashboardSummary {
  const payload = 'success' in response ? response : response.data;

  if (!payload.success) {
    const error = new Error(getDashboardSummaryErrorMessage(payload.message)) as DashboardSummaryError;
    error.statusCode = payload.statusCode;
    throw error;
  }

  return payload.data;
}

export function getDashboardSummaryErrorMessage(message?: string | null) {
  return message?.trim() || '대시보드 요약 조회에 실패했습니다.';
}

export const dashboardApi = {
  getSummary: (params?: DashboardSummaryParams) =>
    axiosInstance.get<ApiResponse<AdminDashboardSummary>>(`${DASHBOARD_API_BASE_PATH}/summary`, { params }),
};
