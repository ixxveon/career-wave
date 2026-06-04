import { apiClient } from '../../utils/apiClient';
import type {
  JobNoticeBookmarkApiResponse,
  JobNoticeDetailApiResponse,
  JobNoticeListApiResponse,
  JobNoticeQueryParams,
} from '../pages/jobNotice/JobNoticeTypes';
import { authSession } from '../utils/member/authSession';

const JOB_NOTICE_BASE_PATH = '/api/v1/user/job-notices';

function createQueryString(params: object = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });

  return query.toString();
}

function createAuthorizationHeaders() {
  const token = authSession.getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const jobApi = {
  getJobNoticeList: (params: JobNoticeQueryParams = {}): Promise<JobNoticeListApiResponse | null> => {
    const query = createQueryString(params);
    return apiClient(`${JOB_NOTICE_BASE_PATH}${query ? `?${query}` : ''}`);
  },

  getJobNoticeDetail: (jobNoticeId: number | string): Promise<JobNoticeDetailApiResponse | null> =>
    apiClient(`${JOB_NOTICE_BASE_PATH}/${encodeURIComponent(String(jobNoticeId))}`),

  toggleJobNoticeBookmark: (
    jobNoticeId: number | string,
    bookmarked: boolean,
  ): Promise<JobNoticeBookmarkApiResponse | null> =>
    apiClient(`${JOB_NOTICE_BASE_PATH}/${encodeURIComponent(String(jobNoticeId))}/bookmark`, {
      method: 'PATCH',
      headers: createAuthorizationHeaders(),
      body: JSON.stringify({ bookmarked }),
    }),
};
