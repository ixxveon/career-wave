import { useMutation } from "@tanstack/react-query";

import { deleteCommunityBoard } from "@/api/user/community";

export function useDeleteCommunityBoard() {
  return useMutation({
    mutationFn: deleteCommunityBoard,
  });
}
