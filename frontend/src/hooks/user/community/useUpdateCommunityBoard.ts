import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updateCommunityBoard } from "@/api/user/community/communityApi";
import { communityQueryKeys } from "./queryKeys";

export function useUpdateCommunityBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boardId,
      request,
    }: {
      boardId: number;
      request: {
        category: string;
        title: string;
        content: string;
      };
    }) => updateCommunityBoard(boardId, request),

    onSuccess: (board) => {
      queryClient.invalidateQueries({
        queryKey: communityQueryKeys.all,
      });

      queryClient.setQueryData(
        communityQueryKeys.board(board.boardId),
        board,
      );
    },
  });
}