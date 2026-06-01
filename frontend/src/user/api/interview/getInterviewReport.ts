import { apiClient } from '../../../utils/apiClient';
import type { InterviewReportResponse } from '../../types/interview';

export function getInterviewReport(sessionId: string): Promise<InterviewReportResponse> {
  return apiClient(`/v1/interview/sessions/${sessionId}/report`).then(
    (res: { data: InterviewReportResponse }) => res.data,
  );
}
