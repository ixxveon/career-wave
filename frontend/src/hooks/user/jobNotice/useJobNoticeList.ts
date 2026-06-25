import { useQuery } from '@tanstack/react-query';
import { jobApi } from '../../../api/user/jobApi';
import type { JobNoticeListApiResponse, JobNoticeQueryParams } from '../../../types/user/jobNotice';

type UseJobNoticeListOptions = {
  enabled?: boolean;
};

export const jobNoticeQueryKeys = {
  all: ['jobNotice'] as const,
  lists: () => [...jobNoticeQueryKeys.all, 'list'] as const,
  list: (params: JobNoticeQueryParams) => [...jobNoticeQueryKeys.lists(), params] as const,
  details: () => [...jobNoticeQueryKeys.all, 'detail'] as const,
  detail: (jobNoticeId: number | null | undefined) =>
    [...jobNoticeQueryKeys.details(), jobNoticeId] as const,
};

export function useJobNoticeList(params: JobNoticeQueryParams, options: UseJobNoticeListOptions = {}) {
  return useQuery({
    queryKey: jobNoticeQueryKeys.list(params),
    queryFn: () => jobApi.getJobNoticeList(params) as Promise<JobNoticeListApiResponse>,
    enabled: options.enabled ?? true,
  });
}
