import { useQuery } from '@tanstack/react-query';
import { resumeHistoryApi } from '../../api/resume/resumeHistoryApi';
import { resumeQueryKeys } from './useAnalysisResult';
import type { FileType } from '../../types/resume.d';

export const useResumeHistory = (page = 0, size = 10, fileType?: FileType) => {
  return useQuery({
    queryKey: resumeQueryKeys.history(page, size, fileType),
    queryFn: ({ signal }) => resumeHistoryApi.getHistory({ page, size, fileType }, signal),
    retry: import.meta.env.DEV ? false : 2,
  });
};
