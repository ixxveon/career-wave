import { useQuery } from '@tanstack/react-query';
import { jobApi } from '../../../api/user/jobApi';
import type { JobNoticeFilterCountApiResponse, JobNoticeQueryParams } from '../../../types/user/jobNotice';
import { jobNoticeQueryKeys } from './useJobNoticeList';

export function useJobNoticeFilterCount(params: JobNoticeQueryParams, enabled: boolean) {
  return useQuery({
    queryKey: [...jobNoticeQueryKeys.lists(), 'count', params],
    queryFn: () => jobApi.getJobNoticeFilterCount(params) as Promise<JobNoticeFilterCountApiResponse>,
    enabled,
    staleTime: 0,
  });
}
