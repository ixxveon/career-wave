import { memberApiClient } from '../member/memberApiClient';
import type { InterviewHistoryResponse } from '../../../types/user/interview';

export interface GetHistoryParams {
  page?: number;
  size?: number;
}

export const interviewHistoryApi = {
  list({ page = 0, size = 10 }: GetHistoryParams = {}, signal?: AbortSignal): Promise<InterviewHistoryResponse> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    return memberApiClient<InterviewHistoryResponse>(
      `/api/v1/user/interview/history?${params}`,
      { auth: true, signal },
    );
  },
};
