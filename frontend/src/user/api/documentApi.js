import { apiClient } from '../../utils/apiClient';

export const documentApi = {
  /**
   * 자기소개서 텍스트 분석
   * POST /api/v1/documents/text
   * Body: { title, jobCategory, items: [{ question, answer }] }
   */
  analyzeCoverLetter: ({ title, jobCategory, items }) =>
    apiClient('/v1/documents/text', {
      method: 'POST',
      body: JSON.stringify({ title, jobCategory, items }),
    }),

  /**
   * 이력서 파일 분석 (S3 업로드 포함)
   * POST /api/v1/documents/file
   * Body: FormData { file: File, jobCategory: string }
   */
  analyzeResume: ({ file, jobCategory }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobCategory', jobCategory);
    return apiClient('/v1/documents/file', {
      method: 'POST',
      body: formData,
    });
  },
};
