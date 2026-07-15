import { apiClient } from '../../utils/apiClient';
import type {
    JobNoticeBookmarkResponse,
    JobNoticeDetailApiResponse,
    JobNoticeListApiResponse,
    JobNoticeQueryParams,
} from '../../types/user/jobNotice';
import { memberApiClient } from './member/memberApiClient';

const JOB_NOTICE_BASE_PATH = '/api/v1/user/job-notices';

type QueryValue = string | string[] | number | boolean | null | undefined;
type QueryParams = Partial<Record<keyof JobNoticeQueryParams, QueryValue>>;

function createQueryString(params: QueryParams = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (Array.isArray(value)) {
            value.filter(Boolean).forEach((item) => query.append(key, item));
            return;
        }
        query.set(key, String(value));
    });

    return query.toString();
}

export const jobApi = {
    getJobNoticeList: (params: JobNoticeQueryParams = {}): Promise<JobNoticeListApiResponse | null> => {
        const query = createQueryString(params);

        return apiClient<JobNoticeListApiResponse>(
            `${JOB_NOTICE_BASE_PATH}${query ? `?${query}` : ''}`,
            { auth: 'optional' },
        );
    },

    getJobNoticeDetail: (jobNoticeId: number | string): Promise<JobNoticeDetailApiResponse | null> =>
        apiClient<JobNoticeDetailApiResponse>(
            `${JOB_NOTICE_BASE_PATH}/${encodeURIComponent(String(jobNoticeId))}`,
            { auth: 'optional' },
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
};
