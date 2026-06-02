import { useQuery } from '@tanstack/react-query';
import { resumeHistoryApi } from '../../api/resume/resumeHistoryApi';
import { resumeQueryKeys } from './useAnalysisResult';

/**
 * 분석 이력 목록 조회 훅
 *
 * - 최신순 페이징 조회
 * - retry: 2 — 이력 목록은 중요도가 낮아 재시도 허용
 */
export const useResumeHistory = (page = 0, size = 10) => {
  return useQuery({
    queryKey: resumeQueryKeys.history(page, size),
    queryFn: ({ signal }) => resumeHistoryApi.getHistory({ page, size }, signal),
    retry: import.meta.env.DEV ? false : 2,
  });
};
