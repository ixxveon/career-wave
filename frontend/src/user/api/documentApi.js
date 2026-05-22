import { apiClient } from './apiClient';

export const documentApi = {
  analyzeResume: (payload) =>
    apiClient('/documents/resume/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  analyzeCoverLetter: (payload) =>
    apiClient('/documents/cover-letter/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
