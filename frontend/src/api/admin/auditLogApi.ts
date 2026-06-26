import axiosInstance from '../../utils/axiosInstance';
import type { ApiResponse, PageResult } from '../../types/admin/index';

export const AUDIT_LOG_API_BASE_PATH = '/api/v1/admin/audit-logs';

export const AUDIT_LOG_TYPE = {
  ADMIN_ACTIVITY: 'ADMIN_ACTIVITY',
  AI_METRICS_SYSTEM: 'AI_METRICS_SYSTEM',
  SCRAPING_SYSTEM: 'SCRAPING_SYSTEM',
} as const;

export type AuditLogType = (typeof AUDIT_LOG_TYPE)[keyof typeof AUDIT_LOG_TYPE];

export const AUDIT_LOG_SEVERITY = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

export type AuditLogSeverity = (typeof AUDIT_LOG_SEVERITY)[keyof typeof AUDIT_LOG_SEVERITY];

export const AUDIT_LOG_TYPE_FILTER = {
  ALL: 'ALL',
  ...AUDIT_LOG_TYPE,
} as const;

export type AuditLogTypeFilter = (typeof AUDIT_LOG_TYPE_FILTER)[keyof typeof AUDIT_LOG_TYPE_FILTER];

export const AUDIT_LOG_SEVERITY_FILTER = {
  ALL: 'ALL',
  ...AUDIT_LOG_SEVERITY,
} as const;

export type AuditLogSeverityFilter = (typeof AUDIT_LOG_SEVERITY_FILTER)[keyof typeof AUDIT_LOG_SEVERITY_FILTER];

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
  requestId?: string;
  logType: AuditLogType;
  logTypeLabel: string;
  severity: AuditLogSeverity;
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
  logType: AuditLogType;
  logTypeLabel: string;
  timestamp: string;
  severity: AuditLogSeverity;
  summary: string;
  detail: string;
}

export interface AuditLogDateRangeParams {
  from?: string;
  to?: string;
}

export interface AuditLogListParams extends AuditLogDateRangeParams {
  logType?: AuditLogType;
  severity?: AuditLogSeverity;
  keyword?: string;
  page?: number;
  size?: number;
}

export const AUDIT_LOG_TYPE_LABELS: Record<AuditLogType, string> = {
  ADMIN_ACTIVITY: '관리자 관리',
  AI_METRICS_SYSTEM: 'AI 메트릭스',
  SCRAPING_SYSTEM: '스크래핑 관리',
};

export const auditLogApi = {
  getSummary: (params?: AuditLogDateRangeParams) =>
    axiosInstance.get<ApiResponse<AuditLogSummary>>(`${AUDIT_LOG_API_BASE_PATH}/summary`, { params }),

  getLogs: (params?: AuditLogListParams) =>
    axiosInstance.get<ApiResponse<PageResult<AuditLogItem>>>(AUDIT_LOG_API_BASE_PATH, { params }),

  getLogDetail: (logId: string) =>
    axiosInstance.get<ApiResponse<AuditLogDetail>>(`${AUDIT_LOG_API_BASE_PATH}/${encodeURIComponent(logId)}`),
};
