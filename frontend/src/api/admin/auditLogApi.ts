import axiosInstance from '../../utils/axiosInstance';
import type { ApiResponse, PageResult } from '../../types/admin/index';

export const AUDIT_LOG_API_BASE_PATH = '/api/v1/admin/audit-logs';

export const AUDIT_LOG_TYPE = {
  ADMIN_ACTIVITY: 'ADMIN_ACTIVITY',
  ADMIN_MANAGEMENT: 'ADMIN_MANAGEMENT',
  AI_METRICS_SYSTEM: 'AI_METRICS_SYSTEM',
  SCRAPING_SYSTEM: 'SCRAPING_SYSTEM',
} as const;

export type AuditLogType = (typeof AUDIT_LOG_TYPE)[keyof typeof AUDIT_LOG_TYPE];

export const BACKEND_AUDIT_LOG_TYPE = {
  ADMIN_MANAGEMENT: 'ADMIN_MANAGEMENT',
} as const;

export const AUDIT_LOG_SEVERITY = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS',
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

export type AuditLogDetail = AuditLogItem;

export interface BackendAuditLogSummary {
  totalCount: number;
  adminActivityCount: number;
  adminManagementCount: number;
  aiMetricsSystemCount: number;
  scrapingSystemCount: number;
  infoCount: number;
  warnCount: number;
  errorCount: number;
  successCount: number;
}

export interface BackendAuditLogItem {
  auditLogId: number;
  adminId: number | null;
  logType: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  severity: string;
  detail: string | null;
  createdAt: string;
}

export type BackendAuditLogDetail = BackendAuditLogItem;

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
  ADMIN_ACTIVITY: '관리자 활동',
  ADMIN_MANAGEMENT: '관리자 계정 관리',
  AI_METRICS_SYSTEM: 'AI 메트릭스',
  SCRAPING_SYSTEM: '스크래핑 관리',
};

const BACKEND_AUDIT_LOG_TYPE_LABELS: Record<string, string> = {
  ...AUDIT_LOG_TYPE_LABELS,
  [BACKEND_AUDIT_LOG_TYPE.ADMIN_MANAGEMENT]: '관리자 관리',
};

function maskIpAddress(ipAddress: string | null) {
  if (!ipAddress) return '-';

  if (ipAddress.includes(':')) {
    const ipv4MappedAddress = ipAddress.slice(ipAddress.lastIndexOf(':') + 1);
    const ipv4MappedParts = ipv4MappedAddress.split('.');
    if (ipv4MappedParts.length === 4) {
      return `${ipAddress.slice(0, ipAddress.lastIndexOf(':') + 1)}${ipv4MappedParts[0]}.${ipv4MappedParts[1]}.${ipv4MappedParts[2]}.*`;
    }

    const firstVisibleGroup = ipAddress.split(':').find(Boolean);
    return firstVisibleGroup ? `${firstVisibleGroup}:*` : ':*';
  }

  const ipv4Parts = ipAddress.split('.');
  if (ipv4Parts.length === 4) {
    return `${ipv4Parts[0]}.${ipv4Parts[1]}.${ipv4Parts[2]}.*`;
  }

  return ipAddress;
}

function formatAuditLogSummary(log: BackendAuditLogItem) {
  return log.action || `${log.logType} audit event`;
}

function formatAuditLogDetail(log: BackendAuditLogItem) {
  if (log.detail?.trim()) {
    return log.detail.trim();
  }

  const target = [log.targetType, log.targetId].filter(Boolean).join(':');
  return target ? `${log.action} / ${target}` : log.action;
}

export function mapBackendAuditLogSummary(summary: BackendAuditLogSummary): AuditLogSummary {
  return {
    totalCount: summary.totalCount,
    adminCount: summary.adminActivityCount + summary.adminManagementCount,
    aiCount: summary.aiMetricsSystemCount,
    scrapingCount: summary.scrapingSystemCount,
    warningCount: summary.warnCount,
    errorCount: summary.errorCount,
    lastSyncedAt: '-',
  };
}

export function mapBackendAuditLogItem(log: BackendAuditLogItem): AuditLogItem {
  return {
    id: String(log.auditLogId),
    logType: log.logType as AuditLogType,
    logTypeLabel: BACKEND_AUDIT_LOG_TYPE_LABELS[log.logType] ?? log.logType,
    severity: log.severity as AuditLogSeverity,
    summary: formatAuditLogSummary(log),
    detailSummary: formatAuditLogDetail(log),
    actorId: log.adminId == null ? '-' : String(log.adminId),
    targetType: log.targetType ?? '-',
    targetId: log.targetId ?? '-',
    ipAddressMasked: maskIpAddress(log.ipAddress),
    occurredAt: log.createdAt,
  };
}

export function mapBackendAuditLogDetail(log: BackendAuditLogDetail): AuditLogDetail {
  return {
    ...mapBackendAuditLogItem(log),
    requestId: '-',
  };
}

function mapAuditLogSummaryResponse(response: ApiResponse<BackendAuditLogSummary>): ApiResponse<AuditLogSummary> {
  return {
    ...response,
    data: mapBackendAuditLogSummary(response.data),
  };
}

function mapAuditLogListResponse(response: ApiResponse<PageResult<BackendAuditLogItem>>): ApiResponse<PageResult<AuditLogItem>> {
  return {
    ...response,
    data: {
      ...response.data,
      content: response.data.content.map(mapBackendAuditLogItem),
    },
  };
}

function mapAuditLogDetailResponse(response: ApiResponse<BackendAuditLogDetail>): ApiResponse<AuditLogDetail> {
  return {
    ...response,
    data: mapBackendAuditLogDetail(response.data),
  };
}

export const auditLogApi = {
  getSummary: (params?: AuditLogDateRangeParams) =>
    axiosInstance
      .get<ApiResponse<BackendAuditLogSummary>>(`${AUDIT_LOG_API_BASE_PATH}/summary`, { params })
      .then((response) => ({
        ...response,
        data: mapAuditLogSummaryResponse(response.data),
      })),

  getLogs: (params?: AuditLogListParams) =>
    axiosInstance
      .get<ApiResponse<PageResult<BackendAuditLogItem>>>(AUDIT_LOG_API_BASE_PATH, { params })
      .then((response) => ({
        ...response,
        data: mapAuditLogListResponse(response.data),
      })),

  getLogDetail: (logId: string) =>
    axiosInstance
      .get<ApiResponse<BackendAuditLogDetail>>(`${AUDIT_LOG_API_BASE_PATH}/${encodeURIComponent(logId)}`)
      .then((response) => ({
        ...response,
        data: mapAuditLogDetailResponse(response.data),
      })),
};
