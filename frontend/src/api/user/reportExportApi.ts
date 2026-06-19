import { apiClient } from '../../utils/apiClient';
import { mockReportPreview } from '../../data/user/careerDiagnosisMockData';

const USE_MOCK_DATA =
    import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA === 'true';

interface ReportPayload {
    recordId?: string;
    [key: string]: unknown;
}

function mockResponse<T>(data: T): Promise<T> {
    return Promise.resolve(structuredClone(data));
}

export const reportExportApi = {
    getPreview: (recordId?: string) => (
        USE_MOCK_DATA
            ? mockResponse({ ...mockReportPreview, selectedRecordId: recordId || null })
            : apiClient(`/report-exports/preview${recordId ? `?recordId=${recordId}` : ''}`)
    ),

    createReport: (payload: ReportPayload) => (
        USE_MOCK_DATA
            ? mockResponse({ ...mockReportPreview, selectedRecordId: payload.recordId, status: 'COMPLETED' })
            : apiClient('/report-exports', {
                method: 'POST',
                body: JSON.stringify(payload),
            })
    ),

    downloadReport: (reportId: string) => (
        USE_MOCK_DATA
            ? mockResponse({ reportId, status: 'DOWNLOADED' })
            : apiClient(`/report-exports/${reportId}/download`)
    ),
};
