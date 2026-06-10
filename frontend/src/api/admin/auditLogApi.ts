import axiosInstance from '../../utils/axiosInstance';
import type { ApiResponse, PageResult } from '../../types/admin/index';

export const AUDIT_LOG_API_BASE_PATH = '/api/v1/admin/audit-logs';

export const AUDIT_LOG_SOURCE = {
  ADMIN: 'ADMIN',
  AI: 'AI',
  SCRAPING: 'SCRAPING',
} as const;

export type AuditLogSource = (typeof AUDIT_LOG_SOURCE)[keyof typeof AUDIT_LOG_SOURCE];

export const AUDIT_LOG_LEVEL = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS',
} as const;

export type AuditLogLevel = (typeof AUDIT_LOG_LEVEL)[keyof typeof AUDIT_LOG_LEVEL];

export const AUDIT_LOG_SOURCE_FILTER = {
  ALL: 'ALL',
  ...AUDIT_LOG_SOURCE,
} as const;

export type AuditLogSourceFilter = (typeof AUDIT_LOG_SOURCE_FILTER)[keyof typeof AUDIT_LOG_SOURCE_FILTER];

export const AUDIT_LOG_LEVEL_FILTER = {
  ALL: 'ALL',
  ...AUDIT_LOG_LEVEL,
} as const;

export type AuditLogLevelFilter = (typeof AUDIT_LOG_LEVEL_FILTER)[keyof typeof AUDIT_LOG_LEVEL_FILTER];

export interface AuditLogSummary {
  totalCount: number;
  adminCount: number;
  aiCount: number;
  scrapingCount: number;
  warningCount: number;
  errorCount: number;
  lastSyncedAt: string;
}

export interface AuditLogItem {
  id: string;
  source: AuditLogSource;
  sourceLabel: string;
  level: AuditLogLevel;
  summary: string;
  detailSummary: string;
  actorId: string;
  targetType: string;
  targetId: string;
  ipAddressMasked: string;
  occurredAt: string;
}

export interface AuditLogDetail extends AuditLogItem {
  requestId: string;
}

export interface AuditLogPreview {
  id: string;
  source: AuditLogSource;
  sourceLabel: string;
  timestamp: string;
  level: AuditLogLevel;
  summary: string;
  detail: string;
}

export interface AuditLogDateRangeParams {
  from?: string;
  to?: string;
}

export interface AuditLogListParams extends AuditLogDateRangeParams {
  source?: AuditLogSource;
  level?: AuditLogLevel;
  keyword?: string;
  page?: number;
  size?: number;
}

export const AUDIT_LOG_SOURCE_LABELS: Record<AuditLogSource, string> = {
  ADMIN: '관리자 관리',
  AI: 'AI 메트릭스',
  SCRAPING: '스크래핑 관리',
};

export const auditLogApi = {
  getSummary: (params?: AuditLogDateRangeParams) =>
    axiosInstance.get<ApiResponse<AuditLogSummary>>(`${AUDIT_LOG_API_BASE_PATH}/summary`, { params }),

  getLogs: (params?: AuditLogListParams) =>
    axiosInstance.get<ApiResponse<PageResult<AuditLogItem>>>(AUDIT_LOG_API_BASE_PATH, { params }),

  getLogDetail: (logId: string) =>
    axiosInstance.get<ApiResponse<AuditLogDetail>>(`${AUDIT_LOG_API_BASE_PATH}/${encodeURIComponent(logId)}`),
};
