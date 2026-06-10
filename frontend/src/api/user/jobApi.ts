import { apiClient } from '../../utils/apiClient';
import type {
    JobNoticeBookmarkResponse,
    JobNoticeDetailApiResponse,
    JobNoticeListApiResponse,
    JobNoticeQueryParams,
} from '../../types/user/jobNotice';
import { memberApiClient } from './member/memberApiClient';

const JOB_NOTICE_BASE_PATH = '/api/v1/user/job-notices';

type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Partial<Record<keyof JobNoticeQueryParams, QueryValue>>;
type JobPayload = Record<string, unknown>;

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

        return apiClient<JobNoticeListApiResponse>(
            `${JOB_NOTICE_BASE_PATH}${query ? `?${query}` : ''}`,
        );
    },

    getJobNoticeDetail: (jobNoticeId: number | string): Promise<JobNoticeDetailApiResponse | null> =>
        apiClient<JobNoticeDetailApiResponse>(
            `${JOB_NOTICE_BASE_PATH}/${encodeURIComponent(String(jobNoticeId))}`,
        ),

    addJobNoticeBookmark: (jobNoticeId: number | string): Promise<JobNoticeBookmarkResponse | null> =>
        memberApiClient<JobNoticeBookmarkResponse | null>(
            `${JOB_NOTICE_BASE_PATH}/${encodeURIComponent(String(jobNoticeId))}/bookmarks`,
            {
                method: 'POST',
                auth: true,
            },
        ),

    deleteJobNoticeBookmark: (jobNoticeId: number | string): Promise<JobNoticeBookmarkResponse | null> =>
        memberApiClient<JobNoticeBookmarkResponse | null>(
            `${JOB_NOTICE_BASE_PATH}/${encodeURIComponent(String(jobNoticeId))}/bookmarks`,
            {
                method: 'DELETE',
                auth: true,
            },
        ),

    getJobs: (params: QueryParams = {}): Promise<unknown | null> => {
        const query = createQueryString(params);

        return apiClient<unknown>(`/jobs${query ? `?${query}` : ''}`);
    },

    getJobDetail: (jobId: number | string): Promise<unknown | null> =>
        apiClient<unknown>(`/jobs/${encodeURIComponent(String(jobId))}`),

    createJob: (payload: JobPayload): Promise<unknown | null> =>
        apiClient<unknown>('/jobs', {
            method: 'POST',
            body: JSON.stringify(payload),
        }),
};
