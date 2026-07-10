import type { QueryClient } from '@tanstack/react-query';
import { dashboardQueryKeys } from '../dashboard/queryKeys';
import { jobNoticeQueryKeys } from '../jobNotice/useJobNoticeList';

export function invalidateBookmarkQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: jobNoticeQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.bookmarkLists() }),
  ]);
}
