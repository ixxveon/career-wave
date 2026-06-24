import axiosInstance from '../../utils/axiosInstance';

export type ApiResponse<T> =
  | { success: true; statusCode: number; message: string | null; data: T; timestamp?: string }
  | { success: false; statusCode: number; message: string | null; data: null; timestamp?: string };

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
  DELETING: 'DELETING',
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

export interface UploadRagDocumentRequest {
  file: File;
  name?: string;
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

export interface AiMetricSummaryRaw {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number | string | null;
  documentRequests: number;
  interviewRequests: number;
  activeModelId: number | null;
  activeModelName: string | null;
}

export interface AiFeatureUsageRaw {
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  cost: number | string | null;
}

export interface AiDomainUsageRaw {
  document: AiFeatureUsageRaw;
  interview: AiFeatureUsageRaw;
}

export interface AiTokenTrendPointRaw {
  bucket: string;
  inputTokens: number;
  outputTokens: number;
  cost: number | string | null;
}

export interface AiTokenTrendRaw {
  interval: AiMetricInterval;
  points: AiTokenTrendPointRaw[];
}

export interface AiHeavyUserRaw {
  memberId: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  cost: number | string | null;
}

export interface AiHeavyUsersRaw {
  users: AiHeavyUserRaw[];
}

export interface AiMetricLogRaw {
  aiUsageLogId: number;
  memberId: string;
  sessionId: string | null;
  aiModelId: number;
  featureType: AiDomain;
  inputTokens: number;
  outputTokens: number;
  cost: number | string | null;
  createdAt: string;
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

export function getAiDisplayModelName(model: AiModelNameFields): string {
  return model.displayModelName || model.actualModelName || '모델 정보 없음';
}

const AI_METRICS_API_BASE_PATH = '/api/v1/admin/ai-metrics';

const DOMAIN_LABELS: Record<AiDomain, string> = {
  [AI_DOMAIN.DOCUMENT]: 'AI 서류 기능',
  [AI_DOMAIN.INTERVIEW]: 'AI 면접 기능',
};

const toNumberOrNull = (value: number | string | null | undefined): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mapApiResponse = <TRaw, TMapped>(
  response: ApiResponse<TRaw>,
  mapper: (data: TRaw) => TMapped
): ApiResponse<TMapped> => {
  if (!response.success) return response;
  return {
    ...response,
    data: mapper(response.data),
  };
};

const getRiskLevel = (tokenUsage: number): AiUsageRiskLevel => {
  if (tokenUsage >= 100000) return AI_USAGE_RISK_LEVEL.CRITICAL;
  if (tokenUsage >= 50000) return AI_USAGE_RISK_LEVEL.WARNING;
  return AI_USAGE_RISK_LEVEL.NORMAL;
};

const getMaskedUserLabel = (memberId: string): string => {
  const suffix = memberId.slice(-4).padStart(4, '*');
  return `USER-${suffix}`;
};

const toFeatureTypeParams = <T extends AiDomainFilterParams | AiMetricLogsParams | undefined>(params: T) => {
  if (!params || !('domain' in params)) return params;
  const { domain, ...rest } = params;
  return {
    ...rest,
    featureType: domain,
  };
};

export const mapAiMetricSummary = (raw: AiMetricSummaryRaw): AiMetricSummary => ({
  totalRequests: raw.totalRequests,
  successRequests: raw.totalRequests,
  failedRequests: 0,
  totalInputTokens: raw.totalInputTokens,
  totalOutputTokens: raw.totalOutputTokens,
  estimatedCost: toNumberOrNull(raw.totalCost),
  averageLatencyMs: 0,
  healthStatus: AI_HEALTH_STATUS.NORMAL,
  lastSyncedAt: new Date().toISOString(),
});

export const mapAiDomainUsage = (raw: AiDomainUsageRaw): AiDomainUsage[] =>
  ([
    [AI_DOMAIN.DOCUMENT, raw.document],
    [AI_DOMAIN.INTERVIEW, raw.interview],
  ] as const).map(([domain, usage]) => {
    const tokenUsage = usage.inputTokens + usage.outputTokens;
    return {
      domain,
      domainLabel: DOMAIN_LABELS[domain],
      requestCount: usage.requestCount,
      successCount: usage.requestCount,
      failureCount: 0,
      failureRate: 0,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost: toNumberOrNull(usage.cost),
      averageLatencyMs: 0,
      riskLevel: getRiskLevel(tokenUsage),
      displayModelName: null,
      actualModelName: null,
    };
  });

export const mapAiTokenTrend = (raw: AiTokenTrendRaw): AiTokenTrendPoint[] =>
  raw.points.map((point) => ({
    bucket: point.bucket,
    inputTokens: point.inputTokens,
    outputTokens: point.outputTokens,
    estimatedCost: toNumberOrNull(point.cost),
    requestCount: 0,
  }));

export const mapAiHeavyUsers = (raw: AiHeavyUsersRaw, domain?: AiDomain): AiHeavyUser[] =>
  raw.users.map((user) => {
    const tokenUsage = user.inputTokens + user.outputTokens;
    return {
      userId: user.memberId,
      maskedUserLabel: getMaskedUserLabel(user.memberId),
      domain: domain ?? AI_DOMAIN.DOCUMENT,
      domainLabel: domain ? DOMAIN_LABELS[domain] : '전체 도메인',
      tokenUsage,
      requestCount: user.requestCount,
      riskLevel: getRiskLevel(tokenUsage),
      lastUsedAt: new Date().toISOString(),
    };
  });

export const mapAiMetricLogs = (raw: PageResult<AiMetricLogRaw>): PageResult<AiMetricLog> => ({
  ...raw,
  content: raw.content.map((item) => ({
    eventId: item.aiUsageLogId,
    occurredAt: item.createdAt,
    domain: item.featureType,
    domainLabel: DOMAIN_LABELS[item.featureType],
    severity: AI_EVENT_SEVERITY.INFO,
    message: `AI usage recorded. inputTokens=${item.inputTokens}, outputTokens=${item.outputTokens}, cost=${toNumberOrNull(item.cost) ?? 0}`,
    displayModelName: null,
    actualModelName: String(item.aiModelId),
  })),
});

export const aiMetricsApi = {
  getSummary: (params?: AiDateRangeParams) =>
    axiosInstance
      .get<ApiResponse<AiMetricSummaryRaw>>(`${AI_METRICS_API_BASE_PATH}/summary`, { params })
      .then((response) => ({
        ...response,
        data: mapApiResponse(response.data, mapAiMetricSummary),
      })),

  getDomainUsage: (params?: AiDateRangeParams) =>
    axiosInstance
      .get<ApiResponse<AiDomainUsageRaw>>(`${AI_METRICS_API_BASE_PATH}/domain-usage`, { params })
      .then((response) => ({
        ...response,
        data: mapApiResponse(response.data, mapAiDomainUsage),
      })),

  getTokenTrend: (params?: AiTokenTrendParams) =>
    axiosInstance
      .get<ApiResponse<AiTokenTrendRaw>>(`${AI_METRICS_API_BASE_PATH}/token-trend`, { params: toFeatureTypeParams(params) })
      .then((response) => ({
        ...response,
        data: mapApiResponse(response.data, mapAiTokenTrend),
      })),

  getHeavyUsers: (params?: AiHeavyUsersParams) =>
    axiosInstance
      .get<ApiResponse<AiHeavyUsersRaw>>(`${AI_METRICS_API_BASE_PATH}/heavy-users`, { params: toFeatureTypeParams(params) })
      .then((response) => ({
        ...response,
        data: mapApiResponse(response.data, (raw) => mapAiHeavyUsers(raw, params?.domain)),
      })),

  getLogs: (params?: AiMetricLogsParams) =>
    axiosInstance
      .get<ApiResponse<PageResult<AiMetricLogRaw>>>(`${AI_METRICS_API_BASE_PATH}/logs`, { params: toFeatureTypeParams(params) })
      .then((response) => ({
        ...response,
        data: mapApiResponse(response.data, mapAiMetricLogs),
      })),

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

  uploadRagDocument: ({ file, name }: UploadRagDocumentRequest) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name?.trim()) {
      formData.append('name', name.trim());
    }

    return axiosInstance.post<ApiResponse<RagDocumentMetric>>(`${AI_METRICS_API_BASE_PATH}/rag-documents`, formData);
  },

  downloadRagDocument: (documentId: string) =>
    axiosInstance.get<Blob>(`${AI_METRICS_API_BASE_PATH}/rag-documents/${documentId}/download`, {
      responseType: 'blob',
    }),

  deleteRagDocument: (documentId: string) =>
    axiosInstance.delete<ApiResponse<null>>(`${AI_METRICS_API_BASE_PATH}/rag-documents/${documentId}`),
};
