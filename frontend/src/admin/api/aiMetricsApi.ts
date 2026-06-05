import axiosInstance from '../../utils/axiosInstance';

export interface ApiResponse<T> {
  success: boolean;
  statusCode?: number;
  message: string | null;
  data: T | null;
  timestamp?: string;
}

export const AI_DOMAIN = {
  DOCUMENT: 'DOCUMENT',
  INTERVIEW: 'INTERVIEW',
} as const;

export const AI_EVENT_SEVERITY = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
} as const;

export const AI_HEALTH_STATUS = {
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;

export const AI_USAGE_RISK_LEVEL = {
  NORMAL: 'NORMAL',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;

export const RAG_INDEX_STATUS = {
  SYNCED: 'SYNCED',
  INDEXING: 'INDEXING',
  FAILED: 'FAILED',
} as const;

export const AI_METRIC_INTERVAL = {
  HOURLY: 'HOURLY',
  DAILY: 'DAILY',
} as const;

export type AiDomain = typeof AI_DOMAIN[keyof typeof AI_DOMAIN];
export type AiEventSeverity = typeof AI_EVENT_SEVERITY[keyof typeof AI_EVENT_SEVERITY];
export type AiHealthStatus = typeof AI_HEALTH_STATUS[keyof typeof AI_HEALTH_STATUS];
export type AiUsageRiskLevel = typeof AI_USAGE_RISK_LEVEL[keyof typeof AI_USAGE_RISK_LEVEL];
export type RagIndexStatus = typeof RAG_INDEX_STATUS[keyof typeof RAG_INDEX_STATUS];
export type AiMetricInterval = typeof AI_METRIC_INTERVAL[keyof typeof AI_METRIC_INTERVAL];

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AiModelNameFields {
  displayModelName: string | null;
  actualModelName: string | null;
}

export interface AiMetricSummary {
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number | null;
  averageLatencyMs: number;
  healthStatus: AiHealthStatus;
  lastSyncedAt: string;
}

export interface AiDomainUsage extends AiModelNameFields {
  domain: AiDomain;
  domainLabel: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  failureRate: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number | null;
  averageLatencyMs: number;
  riskLevel: AiUsageRiskLevel;
}

export interface AiTokenTrendPoint {
  bucket: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number | null;
  requestCount: number;
}

export interface AiHeavyUser {
  userId: string;
  maskedUserLabel: string;
  domain: AiDomain;
  domainLabel: string;
  tokenUsage: number;
  requestCount: number;
  riskLevel: AiUsageRiskLevel;
  lastUsedAt: string;
}

export interface AiMetricLog extends AiModelNameFields {
  eventId: number;
  occurredAt: string;
  domain: AiDomain;
  domainLabel: string;
  severity: AiEventSeverity;
  message: string;
}

export interface AiBudgetSetting {
  monthlyBudget: number;
  currentSpend: number | null;
  forecastSpend: number | null;
  thresholdPercent: number;
  discordAlertEnabled: boolean;
  rateLimitEnabled: boolean;
}

export interface RagDocumentMetric {
  documentId: string;
  name: string;
  chunkCount: number;
  progressPercent: number;
  status: RagIndexStatus;
  updatedAt: string;
}

export interface AiDateRangeParams {
  from?: string;
  to?: string;
}

export interface AiDomainFilterParams extends AiDateRangeParams {
  domain?: AiDomain;
}

export interface AiTokenTrendParams extends AiDomainFilterParams {
  interval?: AiMetricInterval;
}

export interface AiHeavyUsersParams extends AiDomainFilterParams {
  limit?: number;
}

export interface AiMetricLogsParams {
  domain?: AiDomain;
  severity?: AiEventSeverity;
  page?: number;
  size?: number;
}

export interface UpdateAiBudgetRequest {
  monthlyBudget: number;
  thresholdPercent: number;
}

export interface UpdateAiDiscordAlertRequest {
  enabled: boolean;
}

export interface UpdateAiRateLimitRequest {
  enabled: boolean;
  reason: string;
}

const AI_METRICS_API_BASE_PATH = '/api/v1/admin/ai-metrics';

export const aiMetricsApi = {
  getSummary: (params?: AiDateRangeParams) =>
    axiosInstance.get<ApiResponse<AiMetricSummary>>(`${AI_METRICS_API_BASE_PATH}/summary`, { params }),

  getDomainUsage: (params?: AiDateRangeParams) =>
    axiosInstance.get<ApiResponse<AiDomainUsage[]>>(`${AI_METRICS_API_BASE_PATH}/domain-usage`, { params }),

  getTokenTrend: (params?: AiTokenTrendParams) =>
    axiosInstance.get<ApiResponse<AiTokenTrendPoint[]>>(`${AI_METRICS_API_BASE_PATH}/token-trend`, { params }),

  getHeavyUsers: (params?: AiHeavyUsersParams) =>
    axiosInstance.get<ApiResponse<AiHeavyUser[]>>(`${AI_METRICS_API_BASE_PATH}/heavy-users`, { params }),

  getLogs: (params?: AiMetricLogsParams) =>
    axiosInstance.get<ApiResponse<PageResult<AiMetricLog>>>(`${AI_METRICS_API_BASE_PATH}/logs`, { params }),

  getBudget: () =>
    axiosInstance.get<ApiResponse<AiBudgetSetting>>(`${AI_METRICS_API_BASE_PATH}/budget`),

  updateBudget: (data: UpdateAiBudgetRequest) =>
    axiosInstance.patch<ApiResponse<AiBudgetSetting>>(`${AI_METRICS_API_BASE_PATH}/budget`, data),

  updateDiscordAlert: (data: UpdateAiDiscordAlertRequest) =>
    axiosInstance.patch<ApiResponse<AiBudgetSetting>>(`${AI_METRICS_API_BASE_PATH}/alerts/discord`, data),

  updateRateLimit: (data: UpdateAiRateLimitRequest) =>
    axiosInstance.patch<ApiResponse<AiBudgetSetting>>(`${AI_METRICS_API_BASE_PATH}/controls/rate-limit`, data),

  getRagDocuments: () =>
    axiosInstance.get<ApiResponse<RagDocumentMetric[]>>(`${AI_METRICS_API_BASE_PATH}/rag-documents`),
};
