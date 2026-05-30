import { apiClient } from '../../../utils/apiClient';
import type {
  ApiResponse,
  ResumeHistoryParams,
  ResumeHistoryResponse,
} from '../../types/resume.d';

/**
 * 분석 이력 목록 조회
 * GET /api/v1/resume/history
 *
 * - 최신순 페이징 조회 (0-based page)
 */
export const getResumeHistory = (
  { page = 0, size = 10 }: ResumeHistoryParams = {},
  signal?: AbortSignal,
): Promise<ResumeHistoryResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  return apiClient(`/api/v1/resume/history?${params}`, { signal }).then(
    (res: ApiResponse<ResumeHistoryResponse>) => res.data,
  );
};
