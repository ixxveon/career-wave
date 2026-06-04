import { apiClient } from '../../../utils/apiClient';
import type {
  ApiResponse,
  SubmitCoverLetterRequest,
  SubmitCoverLetterResponse,
} from '../../types/resume.d';

/**
 * 자기소개서 문항/답변 제출
 * POST /api/v1/resume/cover-letter
 *
 * - 제출 완료 즉시 서버에서 AI 분석 자동 트리거
 * - 응답의 data.documentId로 WebSocket 연결 시작
 */
export const submitCoverLetter = (
  body: SubmitCoverLetterRequest,
  signal?: AbortSignal,
): Promise<SubmitCoverLetterResponse> => {
  return apiClient('/api/v1/resume/cover-letter', {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  }).then((res: ApiResponse<SubmitCoverLetterResponse>) => res.data);
};
