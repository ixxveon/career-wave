import { apiClient } from '../../utils/apiClient';
import type {
  JobNoticeBookmarkResponse,
  JobNoticeDetailApiResponse,
  JobNoticeListApiResponse,
  JobNoticeQueryParams,
} from '../types/jobNotice';
import { memberApiClient } from './member/memberApiClient';

const JOB_NOTICE_BASE_PATH = '/api/v1/user/job-notices';
type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Partial<Record<keyof JobNoticeQueryParams, QueryValue>>;

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
    return apiClient<JobNoticeListApiResponse>(`${JOB_NOTICE_BASE_PATH}${query ? `?${query}` : ''}`);
  },

  getJobNoticeDetail: (jobNoticeId: number | string): Promise<JobNoticeDetailApiResponse | null> =>
    apiClient<JobNoticeDetailApiResponse>(`${JOB_NOTICE_BASE_PATH}/${encodeURIComponent(String(jobNoticeId))}`),

  toggleJobNoticeBookmark: (
    jobNoticeId: number | string,
    bookmarked: boolean,
  ): Promise<JobNoticeBookmarkResponse | null> =>
    memberApiClient<JobNoticeBookmarkResponse | null>(`${JOB_NOTICE_BASE_PATH}/${encodeURIComponent(String(jobNoticeId))}/bookmark`, {
      method: 'PATCH',
      auth: true,
      body: JSON.stringify({ bookmarked }),
    }),
};
