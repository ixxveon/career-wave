import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteCommunityComment } from "@/api/user/community";
import { communityQueryKeys } from "./queryKeys";

export function useDeleteCommunityComment(boardId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCommunityComment,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: communityQueryKeys.comments(boardId),
      });
    },
  });
}
