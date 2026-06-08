import { useQuery, useQueryClient } from '@tanstack/react-query';
import { interviewReportApi, interviewHistoryApi } from '../../../api/user/interview';
import type { InterviewReportResponse, InterviewHistoryResponse } from '../../../types/user/interview';

// ── QueryKey 팩토리 ────────────────────────────────────────────────
export const interviewQueryKeys = {
  all: ['interview'] as const,
  report:  (sessionId: string) => ['interview', 'report', sessionId] as const,
  history: (page: number, size: number) => ['interview', 'history', page, size] as const,
};

// ── useInterviewReport ─────────────────────────────────────────────
// 리포트 조회 — sessionId null이면 비활성화
// 페이지 재진입·새로고침 시 TanStack Query가 자동 재조회 (constitution §상태 복원력)
export function useInterviewReport(sessionId: string | null) {
  return useQuery<InterviewReportResponse>({
    queryKey: interviewQueryKeys.report(sessionId ?? ''),
    queryFn: ({ signal }) => interviewReportApi.get(sessionId!, signal),
    enabled: !!sessionId,
    retry: 1,
  });
}

// ── useInterviewHistory ────────────────────────────────────────────
// 면접 이력 목록 — 최신순 페이징 조회
export function useInterviewHistory(page = 0, size = 10) {
  return useQuery<InterviewHistoryResponse>({
    queryKey: interviewQueryKeys.history(page, size),
    queryFn: ({ signal }) => interviewHistoryApi.list({ page, size }, signal),
    retry: 2,
  });
}

// ── useInvalidateInterviewHistory ──────────────────────────────────
// 면접 종료(FINISHED) 후 이력 목록 캐시 무효화 (constitution §연동 계약)
export function useInvalidateInterviewHistory() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: interviewQueryKeys.all });
}
