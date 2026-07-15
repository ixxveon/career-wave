import { useInfiniteQuery } from '@tanstack/react-query';
import { jobApi } from '../../../api/user/jobApi';
import type { JobNoticeListApiResponse, JobNoticeQueryParams } from '../../../types/user/jobNotice';

type UseJobNoticeListOptions = {
  enabled?: boolean;
};

const INITIAL_PAGE = 1;
const PAGE_SIZE = 18;

export const jobNoticeQueryKeys = {
  all: ['jobNotice'] as const,
  lists: () => [...jobNoticeQueryKeys.all, 'list'] as const,
  list: (params: JobNoticeQueryParams) => [...jobNoticeQueryKeys.lists(), params] as const,
  details: () => [...jobNoticeQueryKeys.all, 'detail'] as const,
  detail: (jobNoticeId: number | null | undefined) =>
    [...jobNoticeQueryKeys.details(), jobNoticeId] as const,
};

export function useJobNoticeList(params: JobNoticeQueryParams, options: UseJobNoticeListOptions = {}) {
  return useInfiniteQuery({
    queryKey: jobNoticeQueryKeys.list(params),
    queryFn: ({ pageParam }) =>
      jobApi.getJobNoticeList({
        ...params,
        page: pageParam,
        size: PAGE_SIZE,
      }) as Promise<JobNoticeListApiResponse>,
    initialPageParam: INITIAL_PAGE,
    getNextPageParam: (lastPage) => {
      const response = lastPage?.data;

      if (!response) {
        return undefined;
      }

      const nextPage = response.page + 1;
      return nextPage <= response.totalPages ? nextPage : undefined;
    },
    placeholderData: (previousData) => previousData,
    enabled: options.enabled ?? true,
  });
}
