import { apiClient } from '../../../utils/apiClient';
import type { ApiResponse, UploadResumeResponse } from '../../types/resume.d';

/**
 * 이력서 파일 업로드
 * POST /api/v1/resume/upload
 *
 * - multipart/form-data 전송 (apiClient가 Content-Type 자동 설정)
 * - 업로드 완료 즉시 서버에서 AI 분석 자동 트리거
 * - 응답의 data.documentId로 WebSocket 연결 시작
 */
export const uploadResume = (
  file: File,
  signal?: AbortSignal,
): Promise<UploadResumeResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient('/api/v1/resume/upload', {
    method: 'POST',
    body: formData,
    signal,
  }).then((res: ApiResponse<UploadResumeResponse>) => res.data);
};
