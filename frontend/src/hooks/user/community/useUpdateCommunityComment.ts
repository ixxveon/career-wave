import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateCommunityComment } from "@/api/user/community";
import type { UpdateCommunityCommentRequest } from "@/types/user/community";
import { communityQueryKeys } from "./queryKeys";

interface UpdateCommunityCommentVariables {
  commentId: number;
  request: UpdateCommunityCommentRequest;
}

export function useUpdateCommunityComment(boardId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, request }: UpdateCommunityCommentVariables) =>
      updateCommunityComment(commentId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.comments(boardId),
      });
    },
  });
}
