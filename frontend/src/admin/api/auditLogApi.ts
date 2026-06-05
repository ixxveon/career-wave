import axiosInstance from '../../utils/axiosInstance';
import { adminSecurityLogSeeds, aiMetricLogSeeds, scrapingLogSeeds } from '../data/logSeeds';
import type { ApiResponse, PageResult } from './types';

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

export type AuditLogSourceFilter = AuditLogSource | 'ALL';
export type AuditLogLevelFilter = AuditLogLevel | 'ALL';

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

const isValidAuditLogLevel = (value: string): value is AuditLogLevel =>
  Object.values(AUDIT_LOG_LEVEL).includes(value as AuditLogLevel);

const toAuditLogLevel = (value: string): AuditLogLevel =>
  isValidAuditLogLevel(value) ? value : AUDIT_LOG_LEVEL.INFO;

export const auditLogPreviewSeeds: AuditLogPreview[] = [
  ...adminSecurityLogSeeds.map((log) => ({
    id: `ADMIN-${log.id}`,
    source: AUDIT_LOG_SOURCE.ADMIN,
    sourceLabel: AUDIT_LOG_SOURCE_LABELS.ADMIN,
    timestamp: log.time,
    level: toAuditLogLevel(log.severity),
    summary: log.action,
    detail: `actor: ${log.actor} / target: ${log.target} / ip: ${log.ip}`,
  })),
  ...aiMetricLogSeeds.map((log, index) => ({
    id: `AI-${index + 1}`,
    source: AUDIT_LOG_SOURCE.AI,
    sourceLabel: AUDIT_LOG_SOURCE_LABELS.AI,
    timestamp: `2026.05.25 ${log.time}`,
    level: toAuditLogLevel(log.severity),
    summary: log.message,
    detail: 'AI 토큰 사용량 및 리소스 모니터링 이벤트',
  })),
  ...scrapingLogSeeds.map((log) => ({
    id: `SCRAPING-${log.id}`,
    source: AUDIT_LOG_SOURCE.SCRAPING,
    sourceLabel: AUDIT_LOG_SOURCE_LABELS.SCRAPING,
    timestamp: `2026.05.25 ${log.time}`,
    level: toAuditLogLevel(log.level),
    summary: log.message,
    detail: log.detail ?? '스크래핑 파이프라인 상세 이벤트',
  })),
];

export const auditLogApi = {
  getSummary: (params?: AuditLogDateRangeParams) =>
    axiosInstance.get<ApiResponse<AuditLogSummary>>(`${AUDIT_LOG_API_BASE_PATH}/summary`, { params }),

  getLogs: (params?: AuditLogListParams) =>
    axiosInstance.get<ApiResponse<PageResult<AuditLogItem>>>(AUDIT_LOG_API_BASE_PATH, { params }),

  getLogDetail: (logId: string) =>
    axiosInstance.get<ApiResponse<AuditLogDetail>>(`${AUDIT_LOG_API_BASE_PATH}/${encodeURIComponent(logId)}`),
};
