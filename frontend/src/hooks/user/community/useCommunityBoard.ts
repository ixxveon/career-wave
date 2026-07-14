import { useQuery } from "@tanstack/react-query";

import { getCommunityBoard } from "@/api/user/community";
import { communityQueryKeys } from "./queryKeys";

export function useCommunityBoard(boardId: number | null) {
  return useQuery({
    queryKey: boardId
      ? communityQueryKeys.board(boardId)
      : [...communityQueryKeys.all, "board", "invalid"],
    queryFn: () => getCommunityBoard(boardId as number),
    enabled: boardId !== null,
  });
}
