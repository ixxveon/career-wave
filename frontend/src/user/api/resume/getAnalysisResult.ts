import { apiClient } from '../../../utils/apiClient';
import type { ApiResponse, AnalysisResultResponse } from '../../types/resume.d';

/**
 * 분석 결과 조회
 * GET /api/v1/resume/{documentId}/feedback
 *
 * - 실시간 추적은 WebSocket 사용 (WS /ws/resume/{documentId}/status)
 * - 이 함수는 COMPLETED 상태의 전체 결과 조회 또는 페이지 재진입 시 복원 용도
 */
export const getAnalysisResult = (
  documentId: string,
  signal?: AbortSignal,
): Promise<AnalysisResultResponse> => {
  return apiClient(`/api/v1/resume/${documentId}/feedback`, { signal }).then(
    (res: ApiResponse<AnalysisResultResponse>) => res.data,
  );
};
