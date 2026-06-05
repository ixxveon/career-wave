import { apiClient } from '../../utils/apiClient';
import { mockReportPreview } from '../data/careerDiagnosisMockData';

const useMockData = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

function mockResponse(data) {
  return Promise.resolve(structuredClone(data));
}

export const reportExportApi = {
  getPreview: (recordId) => (
    useMockData
      ? mockResponse({ ...mockReportPreview, selectedRecordId: recordId || null })
      : apiClient(`/report-exports/preview${recordId ? `?recordId=${recordId}` : ''}`)
  ),

  createReport: (payload) => (
    useMockData
      ? mockResponse({ ...mockReportPreview, selectedRecordId: payload.recordId, status: 'COMPLETED' })
      : apiClient('/report-exports', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
  ),

  downloadReport: (reportId) => (
    useMockData
      ? mockResponse({ reportId, status: 'DOWNLOADED' })
      : apiClient(`/report-exports/${reportId}/download`)
  ),
};
