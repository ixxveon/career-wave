import { apiClient } from '../../../utils/apiClient';
import type { InterviewReportResponse } from '../../types/interview';

export function getInterviewReport(
  sessionId: string,
  signal?: AbortSignal,
): Promise<InterviewReportResponse> {
  return apiClient(`/api/v1/user/interview/sessions/${sessionId}/report`, { signal }).then(
    (res: { data: InterviewReportResponse }) => res.data,
  );
}
