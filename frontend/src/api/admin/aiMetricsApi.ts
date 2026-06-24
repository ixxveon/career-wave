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
export type RagDocumentStatusRaw = 'UPLOADED' | 'INDEXING' | 'COMPLETED' | 'FAILED';

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

export interface RagDocumentMetricRaw {
  ragDocumentId: number;
  uploadedBy: number;
  fileUuid: string;
  originalFileName: string;
  mimeType: string | null;
  fileSize: number | null;
  chunkCount: number;
  indexingProgress: number;
  status: RagDocumentStatusRaw;
  createdAt: string;
  updatedAt: string;
}

export type RagDocumentDetailRaw = RagDocumentMetricRaw & {
  filePath: string;
};

export type RagDocumentListRaw = PageResult<RagDocumentMetricRaw>;

export interface RagDocumentDownloadRaw {
  ragDocumentId: number;
  originalFileName: string;
  fileUuid: string;
  mimeType: string | null;
  fileSize: number | null;
  downloadUrl: string;
}

export interface RagDocumentDownload {
  documentId: string;
  name: string;
  downloadUrl: string;
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

export const mapRagDocumentStatus = (status: RagDocumentStatusRaw): RagIndexStatus => {
  if (status === 'INDEXING') return RAG_INDEX_STATUS.INDEXING;
  if (status === 'FAILED') return RAG_INDEX_STATUS.FAILED;
  return RAG_INDEX_STATUS.SYNCED;
};

export const mapRagDocumentMetric = (raw: RagDocumentMetricRaw): RagDocumentMetric => ({
  documentId: String(raw.ragDocumentId),
  name: raw.originalFileName,
  chunkCount: raw.chunkCount,
  progressPercent: raw.indexingProgress,
  status: mapRagDocumentStatus(raw.status),
  updatedAt: raw.updatedAt,
});

export const mapRagDocumentList = (raw: RagDocumentListRaw): RagDocumentMetric[] =>
  raw.content.map(mapRagDocumentMetric);

export const mapRagDocumentDownload = (raw: RagDocumentDownloadRaw): RagDocumentDownload => ({
  documentId: String(raw.ragDocumentId),
  name: raw.originalFileName,
  downloadUrl: raw.downloadUrl,
});

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
    axiosInstance
      .get<ApiResponse<RagDocumentListRaw>>(`${AI_METRICS_API_BASE_PATH}/rag-documents`)
      .then((response) => ({
        ...response,
        data: mapApiResponse(response.data, mapRagDocumentList),
      })),

  uploadRagDocument: ({ file, name }: UploadRagDocumentRequest) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name?.trim()) {
      formData.append('name', name.trim());
    }

    return axiosInstance
      .post<ApiResponse<RagDocumentDetailRaw>>(`${AI_METRICS_API_BASE_PATH}/rag-documents`, formData)
      .then((response) => ({
        ...response,
        data: mapApiResponse(response.data, mapRagDocumentMetric),
      }));
  },

  downloadRagDocument: (documentId: string) =>
    axiosInstance
      .get<ApiResponse<RagDocumentDownloadRaw>>(`${AI_METRICS_API_BASE_PATH}/rag-documents/${documentId}/download`)
      .then((response) => ({
        ...response,
        data: mapApiResponse(response.data, mapRagDocumentDownload),
      })),

  deleteRagDocument: (documentId: string) =>
    axiosInstance.delete<ApiResponse<null>>(`${AI_METRICS_API_BASE_PATH}/rag-documents/${documentId}`),
};
