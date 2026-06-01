import { useQuery } from '@tanstack/react-query';
import { memberAuthApi } from '../../api/member';
import { memberQueryKeys } from './queryKeys';

export function useMemberStatus(enabled = true) {
  return useQuery({
    queryKey: memberQueryKeys.status(),
    queryFn: () => memberAuthApi.getMyStatus(),
    enabled,
  });
}
