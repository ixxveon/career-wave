import { memberApiClient } from '../member/memberApiClient';
import type { InterviewReportResponse } from '../../types/interview';

export const interviewReportApi = {
  get(sessionId: string, signal?: AbortSignal): Promise<InterviewReportResponse> {
    return memberApiClient<InterviewReportResponse>(
      `/api/v1/user/interview/sessions/${encodeURIComponent(sessionId)}/report`,
      { auth: true, signal },
    );
  },
};
