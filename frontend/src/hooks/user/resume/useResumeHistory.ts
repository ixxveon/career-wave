import { useQuery } from '@tanstack/react-query';
import { resumeHistoryApi } from '../../../api/user/resume/resumeHistoryApi';
import { resumeQueryKeys } from './queryKeys';

const PAGE_SIZE = 10;

export function useResumeHistory(page: number) {
  return useQuery({
    queryKey: resumeQueryKeys.history(page, PAGE_SIZE),
    queryFn: ({ signal }) =>
      resumeHistoryApi.getHistory({ page, size: PAGE_SIZE }, signal),
    retry: import.meta.env.DEV ? false : 2,
  });
}
