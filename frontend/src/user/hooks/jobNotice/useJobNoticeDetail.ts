import { useQuery } from '@tanstack/react-query';
import { jobApi } from '../../api/jobApi';
import { jobNoticeQueryKeys } from './useJobNoticeList';

export function useJobNoticeDetail(jobNoticeId: number | null | undefined) {
  return useQuery({
    queryKey: jobNoticeQueryKeys.detail(jobNoticeId),
    queryFn: () => jobApi.getJobNoticeDetail(jobNoticeId as number),
    enabled: jobNoticeId != null,
  });
}
