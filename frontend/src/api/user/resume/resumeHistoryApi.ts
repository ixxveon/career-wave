import type { ResumeHistoryItem, ResumeHistoryParams, ResumeHistoryResponse } from '../../../types/user/resume';
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

  async getByDocumentId(documentId: string, signal?: AbortSignal): Promise<ResumeHistoryItem | null> {
    const params = new URLSearchParams({ page: '0', size: '50' });
    const res = await memberApiClient<ResumeHistoryResponse>(
      `/api/v1/user/resume/history?${params}`,
      { auth: true, signal },
    );
    return res.items.find(item => item.documentId === documentId) ?? null;
  },
};
