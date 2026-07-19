import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCommunityReport } from "@/api/user/community";
import type { CreateCommunityReportRequest } from "@/types/user/community";
import type { MemberApiError } from "@/utils/user/member/errorMapping";
import { communityQueryKeys } from "./queryKeys";

export function useCreateCommunityReport(boardId: number) {
  const queryClient = useQueryClient();

  return useMutation<void, MemberApiError, CreateCommunityReportRequest>({
    mutationFn: (request) => createCommunityReport(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.board(boardId),
      });
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.comments(boardId),
      });
    },
  });
}