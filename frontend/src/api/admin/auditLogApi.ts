import axiosInstance from '../../utils/axiosInstance';
import type { ApiResponse, PageResult } from '../../types/admin/index';

export const AUDIT_LOG_API_BASE_PATH = '/api/v1/admin/audit-logs';

const KST_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

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
  adminId?: number;
  targetType?: string;
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

const AUDIT_LOG_ACTION_LABELS: Record<string, string> = {
  VIEW_MEMBER_DETAIL: '회원 상세 조회',
  SANCTION_MEMBER_BLACKLIST: '회원 블랙리스트 처리',
  SANCTION_MEMBER_SUSPEND: '회원 이용 정지',
  UNSUSPEND_MEMBER: '회원 이용 정지 해제',
  CREATE_ADMIN: '관리자 생성',
  UPDATE_ADMIN_ROLE: '관리자 역할 변경',
  UPDATE_ADMIN_STATUS: '관리자 상태 변경',
  DELETE_ADMIN: '관리자 삭제',
  CREATE_IP_ACL: '접근 IP 등록',
  UPDATE_IP_ACL_ENABLED: '접근 IP 상태 변경',
  DELETE_IP_ACL: '접근 IP 삭제',
  UPDATE_AI_BUDGET: 'AI 월 예산 변경',
  UPDATE_DISCORD_ALERT: 'Discord 알림 설정 변경',
  UPDATE_RATE_LIMIT: 'AI 속도 제한 변경',
  UPLOAD_RAG_DOCUMENT: 'RAG 문서 업로드',
  DELETE_RAG_DOCUMENT: 'RAG 문서 삭제',
  GENERATE_SETTLEMENT: '정산 생성',
  CONFIRM_SETTLEMENT: '정산 확정',
  REGENERATE_SETTLEMENT_DELETE_PENDING: '정산 재생성 요청',
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
  if (!log.action) return `${log.logType} 감사 이벤트`;
  return AUDIT_LOG_ACTION_LABELS[log.action] ?? log.action.replace(/_/g, ' ');
}

function formatAuditLogDetail(log: BackendAuditLogItem) {
  if (log.detail?.trim()) {
    return log.detail.trim();
  }

  const target = [log.targetType, log.targetId].filter(Boolean).join(':');
  const action = formatAuditLogSummary(log);
  return target ? `${action} / ${target}` : action;
}

function formatAuditLogOccurredAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = KST_DATE_TIME_FORMATTER.formatToParts(date);
  const lookup = Object.fromEntries(
    parts
      .filter((part) => part.type !== 'literal')
      .map((part): [Intl.DateTimeFormatPartTypes, string] => [part.type, part.value]),
  ) as Partial<Record<Intl.DateTimeFormatPartTypes, string>>;

  return `${lookup.year ?? ''}-${lookup.month ?? ''}-${lookup.day ?? ''} ${lookup.hour ?? ''}:${lookup.minute ?? ''}:${lookup.second ?? ''}`;
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
    actorId: log.adminId == null ? '-' : `admin-${log.adminId}`,
    targetType: log.targetType ?? '-',
    targetId: log.targetId ?? '-',
    ipAddressMasked: maskIpAddress(log.ipAddress),
    occurredAt: formatAuditLogOccurredAt(log.createdAt),
  };
}

export function mapBackendAuditLogDetail(log: BackendAuditLogDetail): AuditLogDetail {
  return mapBackendAuditLogItem(log);
}

function mapAuditLogSummaryResponse(response: ApiResponse<BackendAuditLogSummary>): ApiResponse<AuditLogSummary> {
  if (!response.success) return response;

  return {
    ...response,
    data: mapBackendAuditLogSummary(response.data),
  };
}

function mapAuditLogListResponse(response: ApiResponse<PageResult<BackendAuditLogItem>>): ApiResponse<PageResult<AuditLogItem>> {
  if (!response.success) return response;

  return {
    ...response,
    data: {
      ...response.data,
      content: response.data.content.map(mapBackendAuditLogItem),
    },
  };
}

function mapAuditLogDetailResponse(response: ApiResponse<BackendAuditLogDetail>): ApiResponse<AuditLogDetail> {
  if (!response.success) return response;

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
