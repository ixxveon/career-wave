import axiosInstance from '../../utils/axiosInstance';

// ── 공통 타입 ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ── Enum 상수 ──────────────────────────────────────────────────

const SCRAPING_BASE_STATUS = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
} as const;

export const PIPELINE_STATUS = SCRAPING_BASE_STATUS;

export const SCRAPING_STATUS = {
  SUCCESS: SCRAPING_BASE_STATUS.SUCCESS,
  FAILED: SCRAPING_BASE_STATUS.FAILED,
} as const;

export const SCRAPING_ACTION_TYPE = {
  RUN: 'RUN',
  RETRY: 'RETRY',
  TEST: 'TEST',
} as const;

export type ScrapingStatus = typeof SCRAPING_STATUS[keyof typeof SCRAPING_STATUS];
export type PipelineStatus = typeof PIPELINE_STATUS[keyof typeof PIPELINE_STATUS];
export type ScrapingActionType = typeof SCRAPING_ACTION_TYPE[keyof typeof SCRAPING_ACTION_TYPE];

// ── 도메인 인터페이스 ──────────────────────────────────────────

export interface ScrapingSource {
  sourceName: string;
  status: PipelineStatus;
  successRate: number;
  averageDurationMs: number;
  cycleExpression: string;
  collectedCount: number;
  recentErrorCode: string | null;
  recentErrorMessage: string | null;
  live: boolean;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  updatedAt: string;
}

export interface ScrapingSourceSummary {
  totalSources: number;
  successCount: number;
  failedCount: number;
  totalCollectedCount: number;
  averageSuccessRate: number;
  averageDurationMs: number;
  lastSyncedAt: string;
}

export interface ScrapingSourceDetail extends Omit<ScrapingSource, 'live' | 'updatedAt'> {
  lastRunId: string | null;
}

export interface ScrapingActionRequest {
  actionType: ScrapingActionType;
  reason: string;
}

export interface ScrapingActionResult {
  sourceName: string;
  requestedAction: ScrapingActionType;
  accepted: boolean;
  runId: string | null;
  requestedAt: string;
}

export interface ScrapingBatchActionRequest extends ScrapingActionRequest {
  sourceNames: string[];
}

export interface ScrapingBatchActionItem {
  sourceName: string;
  accepted: boolean;
  message: string;
}

export interface ScrapingBatchActionResult {
  requestedCount: number;
  acceptedCount: number;
  failedCount: number;
  results: ScrapingBatchActionItem[];
}

export interface ScrapingLog {
  logId: string;
  occurredAt: string;
  sourceName: string;
  status: ScrapingStatus;
  message: string;
  detail: string;
  runId: string | null;
}

// ── 쿼리 파라미터 타입 ─────────────────────────────────────────

export interface ScrapingSourceListParams {
  keyword?: string;
  status?: PipelineStatus;
  page?: number;
  size?: number;
}

export interface ScrapingLogListParams {
  sourceName?: string;
  status?: ScrapingStatus;
  page?: number;
  size?: number;
}

// ── API 함수 ───────────────────────────────────────────────────

const SCRAPING_API_BASE_PATH = '/api/v1/admin/scraping';

export const scrapingApi = {
  // 스크래핑 source 목록 조회
  getSources: (params?: ScrapingSourceListParams) =>
    axiosInstance.get<ApiResponse<PageResult<ScrapingSource>>>(`${SCRAPING_API_BASE_PATH}/pipelines`, { params }),

  // 스크래핑 source 요약 조회
  getSummary: () =>
    axiosInstance.get<ApiResponse<ScrapingSourceSummary>>(`${SCRAPING_API_BASE_PATH}/pipelines/summary`),

  // 단일 source 상세 조회
  getSourceDetail: (sourceName: string) =>
    axiosInstance.get<ApiResponse<ScrapingSourceDetail>>(
      `${SCRAPING_API_BASE_PATH}/pipelines/${encodeURIComponent(sourceName)}`
    ),

  // 단일 source 실행 액션 요청
  requestAction: (sourceName: string, data: ScrapingActionRequest) =>
    axiosInstance.post<ApiResponse<ScrapingActionResult>>(
      `${SCRAPING_API_BASE_PATH}/pipelines/${encodeURIComponent(sourceName)}/actions`,
      data
    ),

  // 여러 source 실행 액션 요청
  requestBatchAction: (data: ScrapingBatchActionRequest) =>
    axiosInstance.post<ApiResponse<ScrapingBatchActionResult>>(
      `${SCRAPING_API_BASE_PATH}/pipelines/batch-actions`,
      data
    ),

  // 스크래핑 운영 로그 조회
  getLogs: (params?: ScrapingLogListParams) =>
    axiosInstance.get<ApiResponse<PageResult<ScrapingLog>>>(`${SCRAPING_API_BASE_PATH}/logs`, { params }),
};
