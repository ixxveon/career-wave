import { apiClient } from '../../utils/apiClient';

const JOB_NOTICE_BASE_PATH = '/v1/user/job-notices';

function createQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });

  return query.toString();
}

export const jobApi = {
  getJobNoticeList: (params = {}) => {
    const query = createQueryString(params);
    return apiClient(`${JOB_NOTICE_BASE_PATH}${query ? `?${query}` : ''}`);
  },

  getJobNoticeDetail: (jobNoticeId) =>
    apiClient(`${JOB_NOTICE_BASE_PATH}/${encodeURIComponent(jobNoticeId)}`),

  getJobs: (params = {}) => {
    const query = createQueryString(params);
    return apiClient(`/jobs${query ? `?${query}` : ''}`);
  },

  getJobDetail: (jobId) => apiClient(`/jobs/${jobId}`),

  createJob: (payload) =>
    apiClient('/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
