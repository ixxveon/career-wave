import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteCommunityBoard } from "@/api/user/community";
import { communityQueryKeys } from "./queryKeys";

export function useDeleteCommunityBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCommunityBoard,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: communityQueryKeys.all,
      });
    },
  });
}
