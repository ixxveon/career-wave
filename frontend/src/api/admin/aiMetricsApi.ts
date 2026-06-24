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
  selectedModelId: number | null;
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

export interface UpdateAiBudgetRequest {
  selectedModelId?: number | null;
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

export interface AiBudgetSettingRaw {
  aiOpsSettingId: number;
  selectedModelId: number | null;
  monthlyBudget: number | string;
  alertEnabled: boolean;
  alertChannel: string;
  alertThreshold: number;
  rateLimitEnabled: boolean;
  updatedAt: string;
}

export interface UpdateAiBudgetRequestRaw {
  selectedModelId: number;
  monthlyBudget: number;
  alertThreshold: number;
}

export interface UpdateAiDiscordAlertRequestRaw {
  alertEnabled: boolean;
}

export interface UpdateAiRateLimitRequestRaw {
  rateLimitEnabled: boolean;
}

export function getAiDisplayModelName(model: AiModelNameFields): string {
  return model.displayModelName || model.actualModelName || '모델 정보 없음';
}

const AI_METRICS_API_BASE_PATH = '/api/v1/admin/ai-metrics';

const toNumber = (value: number | string): number => {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

export const mapAiBudgetSetting = (raw: AiBudgetSettingRaw): AiBudgetSetting => ({
  selectedModelId: raw.selectedModelId,
  monthlyBudget: toNumber(raw.monthlyBudget),
  currentSpend: null,
  forecastSpend: null,
  thresholdPercent: raw.alertThreshold,
  discordAlertEnabled: raw.alertEnabled,
  rateLimitEnabled: raw.rateLimitEnabled,
});

export const toUpdateAiBudgetRequestRaw = (
  data: UpdateAiBudgetRequest,
  currentBudget: AiBudgetSetting | null
): UpdateAiBudgetRequestRaw => {
  const selectedModelId = data.selectedModelId ?? currentBudget?.selectedModelId;
  if (selectedModelId == null) {
    throw new Error('AI 운영 모델 정보가 없어 예산 설정을 수정할 수 없습니다.');
  }

  return {
    selectedModelId,
    monthlyBudget: data.monthlyBudget,
    alertThreshold: data.thresholdPercent,
  };
};

export const toUpdateAiDiscordAlertRequestRaw = (data: UpdateAiDiscordAlertRequest): UpdateAiDiscordAlertRequestRaw => ({
  alertEnabled: data.enabled,
});

export const toUpdateAiRateLimitRequestRaw = (data: UpdateAiRateLimitRequest): UpdateAiRateLimitRequestRaw => ({
  rateLimitEnabled: data.enabled,
});

let cachedBudgetSetting: AiBudgetSetting | null = null;

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
    axiosInstance
      .get<ApiResponse<AiBudgetSettingRaw>>(`${AI_METRICS_API_BASE_PATH}/budget`)
      .then((response) => {
        const mappedData = mapApiResponse(response.data, mapAiBudgetSetting);
        if (mappedData.success) cachedBudgetSetting = mappedData.data;
        return {
          ...response,
          data: mappedData,
        };
      }),

  updateBudget: (data: UpdateAiBudgetRequest) =>
    axiosInstance
      .patch<ApiResponse<AiBudgetSettingRaw>>(
        `${AI_METRICS_API_BASE_PATH}/budget`,
        toUpdateAiBudgetRequestRaw(data, cachedBudgetSetting)
      )
      .then((response) => {
        const mappedData = mapApiResponse(response.data, mapAiBudgetSetting);
        if (mappedData.success) cachedBudgetSetting = mappedData.data;
        return {
          ...response,
          data: mappedData,
        };
      }),

  updateDiscordAlert: (data: UpdateAiDiscordAlertRequest) =>
    axiosInstance
      .patch<ApiResponse<AiBudgetSettingRaw>>(
        `${AI_METRICS_API_BASE_PATH}/alerts/discord`,
        toUpdateAiDiscordAlertRequestRaw(data)
      )
      .then((response) => {
        const mappedData = mapApiResponse(response.data, mapAiBudgetSetting);
        if (mappedData.success) cachedBudgetSetting = mappedData.data;
        return {
          ...response,
          data: mappedData,
        };
      }),

  updateRateLimit: (data: UpdateAiRateLimitRequest) =>
    axiosInstance
      .patch<ApiResponse<AiBudgetSettingRaw>>(
        `${AI_METRICS_API_BASE_PATH}/controls/rate-limit`,
        toUpdateAiRateLimitRequestRaw(data)
      )
      .then((response) => {
        const mappedData = mapApiResponse(response.data, mapAiBudgetSetting);
        if (mappedData.success) cachedBudgetSetting = mappedData.data;
        return {
          ...response,
          data: mappedData,
        };
      }),

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
