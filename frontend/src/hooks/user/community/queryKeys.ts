export const communityQueryKeys = {
  all: ["community"] as const,
  board: (boardId: number) =>
    [...communityQueryKeys.all, "board", boardId] as const,
  comments: (boardId: number) =>
    [...communityQueryKeys.all, "comments", boardId] as const,
};
