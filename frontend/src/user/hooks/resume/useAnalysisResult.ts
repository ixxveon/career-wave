import { useQuery } from '@tanstack/react-query';
import { getAnalysisResult } from '../../api/resume/getAnalysisResult';

// ── QueryKey 컨벤션 ─────────────────────────────────────────────
// resume 도메인 전체에서 공유하는 queryKey 팩토리
export const resumeQueryKeys = {
  all: ['resume'] as const,
  feedback: (documentId: string) =>
    ['resume', 'feedback', documentId] as const,
  history: (page: number, size: number) =>
    ['resume', 'history', page, size] as const,
};

// ── useAnalysisResult ────────────────────────────────────────────
/**
 * 분석 결과 조회 훅
 *
 * - documentId가 null이면 쿼리 비활성화
 * - 페이지 재진입·새로고침 시 TanStack Query가 자동 재조회
 * - 실시간 상태 추적은 WebSocket 사용 (useAnalysisWebSocket에서 담당)
 * - retry: 1 — 네트워크 오류 시 1회 재시도 (기본값 override)
 */
export const useAnalysisResult = (documentId: string | null) => {
  return useQuery({
    queryKey: resumeQueryKeys.feedback(documentId ?? ''),
    queryFn: ({ signal }) => getAnalysisResult(documentId!, signal),
    enabled: !!documentId,
    retry: 1,
  });
};
