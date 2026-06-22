import type { ResumeQuotaResponse } from '../../../types/user/resume';
import { memberApiClient } from '../member/memberApiClient';

export const resumeQuotaApi = {
  getQuota(signal?: AbortSignal): Promise<ResumeQuotaResponse> {
    return memberApiClient<ResumeQuotaResponse>(
      '/api/v1/user/resume/quota',
      { auth: true, signal },
    );
  },
};
