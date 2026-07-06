import { useQuery, useQueryClient } from '@tanstack/react-query';
import { interviewReportApi, interviewHistoryApi } from '../../../api/user/interview';
import type { InterviewReportResponse, InterviewHistoryResponse } from '../../../types/user/interview';
import type { MemberApiError } from '../../../utils/user/member/errorMapping';

// ── QueryKey 팩토리 ────────────────────────────────────────────────
export const interviewQueryKeys = {
  all: ['interview'] as const,
  report:  (sessionId: string) => ['interview', 'report', sessionId] as const,
  history: (page: number, size: number) => ['interview', 'history', page, size] as const,
};

// ── useInterviewReport ─────────────────────────────────────────────
// 리포트 조회 — sessionId null이면 비활성화
// 409 INTERVIEW_REPORT_NOT_READY: estimatedWaitSeconds 기반 자동 폴링 (최대 8회)
// 페이지 재진입·새로고침 시 TanStack Query가 자동 재조회 (constitution §상태 복원력)
export function useInterviewReport(sessionId: string | null) {
  const query = useQuery<InterviewReportResponse, MemberApiError>({
    queryKey: interviewQueryKeys.report(sessionId ?? ''),
    queryFn: ({ signal }) => interviewReportApi.get(sessionId!, signal),
    enabled: !!sessionId,
    retry: (failureCount, error) => {
      if (error.statusCode === 409 && error.serverCode === 'INTERVIEW_REPORT_NOT_READY') {
        return failureCount < 8;
      }
      return failureCount < 1;
    },
    retryDelay: (_failureCount, error) => {
      if (error.statusCode === 409 && error.serverCode === 'INTERVIEW_REPORT_NOT_READY') {
        const waitData = error.data as { estimatedWaitSeconds?: number } | undefined;
        return (waitData?.estimatedWaitSeconds ?? 15) * 1000;
      }
      return 1000;
    },
  });

  // isAnalyzing: 재시도 중(failureCount < 8)에만 분석 중으로 처리
  // 재시도 소진(isError) 후에는 일반 에러로 떨어뜨려 "불러올 수 없습니다" 화면을 노출
  const is409NotReady = (e: MemberApiError | null | undefined): boolean =>
    e?.statusCode === 409 && e?.serverCode === 'INTERVIEW_REPORT_NOT_READY';

  const isAnalyzing =
    !query.isError &&
    query.failureCount > 0 &&
    is409NotReady(query.failureReason as MemberApiError | null);

  return { ...query, isAnalyzing };
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
