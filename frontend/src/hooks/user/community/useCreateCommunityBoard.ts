import { useMutation } from "@tanstack/react-query";

import { createCommunityBoard } from "@/api/user/community";
import type { CreateCommunityBoardRequest } from "@/types/user/community";

export function useCreateCommunityBoard() {
  return useMutation({
    mutationFn: (request: CreateCommunityBoardRequest) =>
      createCommunityBoard(request),
  });
}
