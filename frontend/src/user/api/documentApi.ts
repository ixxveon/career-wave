import { apiClient } from '../../utils/apiClient';
import type {
  AnalyzeCoverLetterParams,
  AnalyzeResumeParams,
  DocumentResult,
} from '../types/document';

export const documentApi = {
  analyzeCoverLetter: ({ title, jobCategory, items }: AnalyzeCoverLetterParams): Promise<DocumentResult> =>
    apiClient('/v1/documents/text', {
      method: 'POST',
      body: JSON.stringify({ title, jobCategory, items }),
    }),

  analyzeResume: ({ file, targetCompany, jobCategory }: AnalyzeResumeParams): Promise<DocumentResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('targetCompany', targetCompany);
    formData.append('jobCategory', jobCategory);
    return apiClient('/v1/documents/file', {
      method: 'POST',
      body: formData,
    });
  },
};
