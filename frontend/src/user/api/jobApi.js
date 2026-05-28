import { apiClient } from '../../utils/apiClient';

export const jobApi = {
  getJobs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient(`/jobs${query ? `?${query}` : ''}`);
  },

  getJobDetail: (jobId) => apiClient(`/jobs/${jobId}`),

  createJob: (payload) =>
    apiClient('/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
