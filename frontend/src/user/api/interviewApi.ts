import { apiClient } from '../../utils/apiClient';
import type { SetupApiResponse, StartSessionParams } from '../types/interview';

export const interviewApi = {
  getSetup: (): Promise<SetupApiResponse> => apiClient('/v1/interviews/setup'),
  startSession: ({ targetJob, targetCompany, resumeS3Url }: StartSessionParams): Promise<void> =>
    apiClient('/v1/interviews/start', {
      method: 'POST',
      body: JSON.stringify({ targetJob, targetCompany, resumeS3Url }),
    }),
};
