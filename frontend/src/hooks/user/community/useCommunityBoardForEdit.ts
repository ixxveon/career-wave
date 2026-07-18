import { useQuery } from "@tanstack/react-query";

import { getCommunityBoardForEdit } from "@/api/user/community";
import { communityQueryKeys } from "./queryKeys";

export function useCommunityBoardForEdit(boardId: number | null) {
  return useQuery({
    queryKey:
      boardId !== null
        ? [...communityQueryKeys.board(boardId), "edit"]
        : [...communityQueryKeys.all, "board", "edit", "invalid"],
    queryFn: () => getCommunityBoardForEdit(boardId as number),
    enabled: boardId !== null,
    retry: false,
  });
}
