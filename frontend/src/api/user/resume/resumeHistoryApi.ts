import type { ResumeHistoryParams, ResumeHistoryResponse } from '../../../types/user/resume';
import { memberApiClient } from '../member/memberApiClient';

export const resumeHistoryApi = {
  getHistory(
    { page = 0, size = 10, fileType }: ResumeHistoryParams = {},
    signal?: AbortSignal,
  ): Promise<ResumeHistoryResponse> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (fileType) params.set('fileType', fileType);

    return memberApiClient<ResumeHistoryResponse>(
      `/api/v1/user/resume/history?${params}`,
      { auth: true, signal },
    );
  },
};
