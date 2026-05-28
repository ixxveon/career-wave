import { apiClient } from '../../utils/apiClient';

export const interviewApi = {
  /**
   * 마이페이지 대표 이력서 및 설정 정보 조회
   * GET /api/v1/interviews/setup
   * Returns: { resumeFileName, resumeS3Url }
   */
  getSetup: () => apiClient('/v1/interviews/setup'),

  /**
   * 면접 세션 생성
   * POST /api/v1/interviews/start
   * Body: { targetJob, targetCompany, resumeS3Url }
   * Returns: { sessionId, wsUrl }
   */
  startSession: ({ targetJob, targetCompany, resumeS3Url }) =>
    apiClient('/v1/interviews/start', {
      method: 'POST',
      body: JSON.stringify({ targetJob, targetCompany, resumeS3Url }),
    }),
};
