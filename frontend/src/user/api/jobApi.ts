import { apiClient } from '../../utils/apiClient';
import type {
  JobNoticeDetailApiResponse,
  JobNoticeListApiResponse,
  JobNoticeQueryParams,
} from '../pages/jobNotice/JobNoticeTypes';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

const JOB_NOTICE_BASE_PATH = '/v1/user/job-notices';

function createQueryString(params: QueryParams = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });

  return query.toString();
}

export const jobApi = {
  getJobNoticeList: (params: JobNoticeQueryParams = {}): Promise<JobNoticeListApiResponse> => {
    const query = createQueryString(params);
    return apiClient(`${JOB_NOTICE_BASE_PATH}${query ? `?${query}` : ''}`);
  },

  getJobNoticeDetail: (jobNoticeId: number | string): Promise<JobNoticeDetailApiResponse> =>
    apiClient(`${JOB_NOTICE_BASE_PATH}/${encodeURIComponent(String(jobNoticeId))}`),

  getJobs: (params: QueryParams = {}) => {
    const query = createQueryString(params);
    return apiClient(`/jobs${query ? `?${query}` : ''}`);
  },

  getJobDetail: (jobId: number | string) => apiClient(`/jobs/${encodeURIComponent(String(jobId))}`),

  createJob: (payload: unknown) =>
    apiClient('/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
