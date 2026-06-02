import { apiClient } from '../../../utils/apiClient';
import type { InterviewHistoryResponse } from '../../types/interview';

export interface GetHistoryParams {
  page?: number;
  size?: number;
}

export function getInterviewHistory(
  { page = 0, size = 10 }: GetHistoryParams = {},
  signal?: AbortSignal,
): Promise<InterviewHistoryResponse> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  return apiClient(`/api/v1/user/interview/history?${params}`, { signal }).then(
    (res: { data: InterviewHistoryResponse }) => res.data,
  );
}
