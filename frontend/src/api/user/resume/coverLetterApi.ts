import type { SubmitCoverLetterRequest, SubmitCoverLetterResponse } from '../../../types/user/resume';
import { memberApiClient } from '../member/memberApiClient';

export const coverLetterApi = {
  submit(body: SubmitCoverLetterRequest, signal?: AbortSignal): Promise<SubmitCoverLetterResponse> {
    return memberApiClient<SubmitCoverLetterResponse>('/api/v1/user/resume/cover-letter', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
      signal,
    });
  },
};
