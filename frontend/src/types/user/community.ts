export interface CommunityBoard {
  boardId: number;
  memberId: string;
  category: string;
  title: string;
  content: string;
  viewCount: number;
  blind: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityComment {
  commentId: number;
  boardId: number;
  memberId: string;
  parentId: number | null;
  content: string;
  blind: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommunityCommentRequest {
  parentId: number | null;
  content: string;
}
