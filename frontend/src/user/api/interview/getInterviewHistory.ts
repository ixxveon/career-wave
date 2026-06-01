import { apiClient } from '../../../utils/apiClient';
import type { InterviewHistoryResponse } from '../../types/interview';

export interface GetHistoryParams {
  page?: number;
  size?: number;
}

export function getInterviewHistory({ page = 0, size = 10 }: GetHistoryParams = {}): Promise<InterviewHistoryResponse> {
  return apiClient(`/v1/interview/history?page=${page}&size=${size}`).then(
    (res: { data: InterviewHistoryResponse }) => res.data,
  );
}
