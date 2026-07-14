import { useQuery } from "@tanstack/react-query";

import { getCommunityComments } from "@/api/user/community";
import { communityQueryKeys } from "./queryKeys";

export function useCommunityComments(boardId: number | null) {
  return useQuery({
    queryKey: boardId
      ? communityQueryKeys.comments(boardId)
      : [...communityQueryKeys.all, "comments", "invalid"],
    queryFn: () => getCommunityComments(boardId as number),
    enabled: boardId !== null,
  });
}
