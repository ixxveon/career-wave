import { useQuery } from '@tanstack/react-query';
import { analysisResultApi } from '../../api/resume/analysisResultApi';
import { resumeQueryKeys } from './queryKeys';

export { resumeQueryKeys };

/**
 * 분석 결과 조회 훅
 *
 * - documentId가 null이면 쿼리 비활성화
 * - 페이지 재진입·새로고침 시 TanStack Query가 자동 재조회
 * - 실시간 상태 추적은 WebSocket 사용 (useAnalysisWebSocket에서 담당)
 * - retry: 1 — 네트워크 오류 시 1회 재시도 (기본값 override)
 */
export function useAnalysisResult(documentId: string | null) {
  return useQuery({
    queryKey: resumeQueryKeys.feedback(documentId ?? ''),
    queryFn: ({ signal }) => analysisResultApi.getFeedback(documentId!, signal),
    enabled: !!documentId,
    retry: 1,
  });
}
