import type { AnalysisResultResponse } from '../../types/resume';
import { memberApiClient } from '../member/memberApiClient';

export const analysisResultApi = {
  getFeedback(documentId: string, signal?: AbortSignal): Promise<AnalysisResultResponse> {
    return memberApiClient<AnalysisResultResponse>(
      `/api/v1/user/resume/${documentId}/feedback`,
      { auth: true, signal },
    );
  },
};
