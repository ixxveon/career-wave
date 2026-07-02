import { useQuery } from '@tanstack/react-query';
import { resumeQuotaApi } from '../../../api/user/resume/resumeQuotaApi';
import type { MemberApiError } from '../../../utils/user/member/errorMapping';

export const QUOTA_QUERY_KEY = ['resume', 'quota'] as const;

export function useResumeQuota() {
  const query = useQuery({
    queryKey: QUOTA_QUERY_KEY,
    queryFn: () => resumeQuotaApi.getQuota(),
    staleTime: 0,
    retry: false,
  });

  const isEntitlementNotFound =
    query.isError && (query.error as unknown as MemberApiError)?.statusCode === 404;

  return { ...query, isEntitlementNotFound };
}
