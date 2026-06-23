import { useQuery } from '@tanstack/react-query';
import { resumeQuotaApi } from '../../../api/user/resume/resumeQuotaApi';

export const QUOTA_QUERY_KEY = ['resume', 'quota'] as const;

export function useResumeQuota() {
  return useQuery({
    queryKey: QUOTA_QUERY_KEY,
    queryFn: () => resumeQuotaApi.getQuota(),
    staleTime: 0,
  });
}
