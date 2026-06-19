import { useInfiniteQuery } from '@tanstack/react-query';
import { resumeHistoryApi } from '../../../api/user/resume/resumeHistoryApi';
import { resumeQueryKeys } from './queryKeys';

const PAGE_SIZE = 5;

export function useResumeHistory() {
  return useInfiniteQuery({
    queryKey: resumeQueryKeys.historyInfinite(),
    queryFn: ({ pageParam, signal }) =>
      resumeHistoryApi.getHistory({ page: pageParam, size: PAGE_SIZE }, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const next = lastPage.page + 1;
      return next < lastPage.totalPages ? next : undefined;
    },
    retry: import.meta.env.DEV ? false : 2,
  });
}
