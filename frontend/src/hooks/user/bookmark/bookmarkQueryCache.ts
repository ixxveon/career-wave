import type { QueryClient } from '@tanstack/react-query';
import { dashboardQueryKeys } from '../dashboard/queryKeys';
import { jobNoticeQueryKeys } from '../jobNotice/useJobNoticeList';

type BookmarkQueryClient = Pick<QueryClient, 'invalidateQueries'>;

export function invalidateBookmarkQueries(queryClient: BookmarkQueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: jobNoticeQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.bookmarkLists() }),
  ]);
}
