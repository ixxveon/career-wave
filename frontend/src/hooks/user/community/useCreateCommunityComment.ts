import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCommunityComment } from "@/api/user/community";
import type { CreateCommunityCommentRequest } from "@/types/user/community";
import { communityQueryKeys } from "./queryKeys";

export function useCreateCommunityComment(boardId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateCommunityCommentRequest) =>
      createCommunityComment(boardId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.comments(boardId),
      });
    },
  });
}
