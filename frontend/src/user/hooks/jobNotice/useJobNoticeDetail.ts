import { useQuery } from '@tanstack/react-query';
import { jobApi } from '../../api/jobApi';
import type { JobNoticeDetailApiResponse } from '../../pages/jobNotice/JobNoticeTypes';
import { jobNoticeQueryKeys } from './useJobNoticeList';

export function useJobNoticeDetail(jobNoticeId: number | null | undefined) {
  return useQuery({
    queryKey: jobNoticeQueryKeys.detail(jobNoticeId),
    queryFn: () => jobApi.getJobNoticeDetail(jobNoticeId as number) as Promise<JobNoticeDetailApiResponse>,
    enabled: jobNoticeId != null,
  });
}
