import { apiClient } from '../../utils/apiClient';
import { mockReportPreview } from '../../data/user/careerDiagnosisMockData';

const useMockData = import.meta.env.VITE_USE_MOCK_DATA !== 'false';

interface ReportPayload {
  recordId?: string;
  [key: string]: unknown;
}

function mockResponse<T>(data: T): Promise<T> {
  return Promise.resolve(structuredClone(data));
}

export const reportExportApi = {
  getPreview: (recordId?: string) => (
    useMockData
      ? mockResponse({ ...mockReportPreview, selectedRecordId: recordId || null })
      : apiClient(`/report-exports/preview${recordId ? `?recordId=${recordId}` : ''}`)
  ),

  createReport: (payload: ReportPayload) => (
    useMockData
      ? mockResponse({ ...mockReportPreview, selectedRecordId: payload.recordId, status: 'COMPLETED' })
      : apiClient('/report-exports', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
  ),

  downloadReport: (reportId: string) => (
    useMockData
      ? mockResponse({ reportId, status: 'DOWNLOADED' })
      : apiClient(`/report-exports/${reportId}/download`)
  ),
};
