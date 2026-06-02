import type { ResumeHistoryParams, ResumeHistoryResponse } from '../../types/resume.d';
import { memberApiClient } from '../member/memberApiClient';

export const resumeHistoryApi = {
  getHistory(
    { page = 0, size = 10 }: ResumeHistoryParams = {},
    signal?: AbortSignal,
  ): Promise<ResumeHistoryResponse> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });

    return memberApiClient<ResumeHistoryResponse>(
      `/api/v1/user/resume/history?${params}`,
      { auth: true, signal },
    );
  },
};
