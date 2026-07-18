export interface CommunityBoard {
  boardId: number;
  memberId: string;
  memberName: string;
  category: string;
  title: string;
  content: string;
  viewCount: number;
  reportCount: number;
  blind: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityComment {
  commentId: number;
  boardId: number;
  memberId: string;
  memberName: string;
  parentId: number | null;
  content: string;
  reportCount: number;
  blind: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommunityCommentRequest {
  parentId: number | null;
  content: string;
}
export interface UpdateCommunityCommentRequest {
  content: string;
}
export interface CreateCommunityBoardRequest {
  category: string;
  title: string;
  content: string;
}

export type CommunityReportTargetType = "BOARD" | "COMMENT";

export type CommunityReportReason =
  | "SPAM"
  | "ABUSE"
  | "AD"
  | "INAPPROPRIATE"
  | "OTHER";

export interface CreateCommunityReportRequest {
  targetType: CommunityReportTargetType;
  targetId: number;
  reason: CommunityReportReason;
}
