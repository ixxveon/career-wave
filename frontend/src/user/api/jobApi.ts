import { apiClient } from '../../utils/apiClient';
import type {
  JobNoticeDetailApiResponse,
  JobNoticeListApiResponse,
  JobNoticeQueryParams,
} from '../pages/jobNotice/JobNoticeTypes';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

const JOB_NOTICE_BASE_PATH = '/api/v1/user/job-notices';

function createQueryString(params: QueryParams = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });

  return query.toString();
}

export const jobApi = {
  getJobNoticeList: (params: JobNoticeQueryParams = {}): Promise<JobNoticeListApiResponse | null> => {
    const query = createQueryString(params);
    return apiClient(`${JOB_NOTICE_BASE_PATH}${query ? `?${query}` : ''}`);
  },

  getJobNoticeDetail: (jobNoticeId: number | string): Promise<JobNoticeDetailApiResponse | null> =>
    apiClient(`${JOB_NOTICE_BASE_PATH}/${encodeURIComponent(String(jobNoticeId))}`),
};
