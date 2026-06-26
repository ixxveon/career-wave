import { useQuery } from '@tanstack/react-query';
import { jobApi } from '../../../api/user/jobApi';
import type { JobNoticeDetailApiResponse } from '../../../types/user/jobNotice';
import { jobNoticeQueryKeys } from './useJobNoticeList';

type UseJobNoticeDetailOptions = {
  enabled?: boolean;
};

export function useJobNoticeDetail(
  jobNoticeId: number | null | undefined,
  options: UseJobNoticeDetailOptions = {},
) {
  return useQuery({
    queryKey: jobNoticeQueryKeys.detail(jobNoticeId),
    queryFn: () => jobApi.getJobNoticeDetail(jobNoticeId as number) as Promise<JobNoticeDetailApiResponse>,
    enabled: jobNoticeId != null && (options.enabled ?? true),
  });
}
