import { memberApiClient } from "@/api/user/member/memberApiClient";

import type {
  CommunityBoard,
  CommunityComment,
  CreateCommunityBoardRequest,
  CreateCommunityCommentRequest,
  CreateCommunityReportRequest,
} from "@/types/user/community";

export async function getCommunityBoard(boardId: number) {
  return memberApiClient<CommunityBoard>(
    `/api/v1/user/community/boards/${boardId}`,
    {
      method: "GET",
      auth: true,
    },
  );
}

export async function getCommunityComments(boardId: number) {
  return memberApiClient<CommunityComment[]>(
    `/api/v1/user/community/boards/${boardId}/comments`,
    {
      method: "GET",
      auth: true,
    },
  );
}

export async function createCommunityComment(
  boardId: number,
  request: CreateCommunityCommentRequest,
) {
  return memberApiClient<CommunityComment>(
    `/api/v1/user/community/boards/${boardId}/comments`,
    {
      method: "POST",
      auth: true,
      allowRetry: true,
      body: JSON.stringify(request),
    },
  );
}

export async function deleteCommunityComment(commentId: number) {
  return memberApiClient<void>(`/api/v1/user/community/comments/${commentId}`, {
    method: "DELETE",
    auth: true,
    allowRetry: true,
  });
}

export async function deleteCommunityBoard(boardId: number) {
  return memberApiClient<void>(`/api/v1/user/community/boards/${boardId}`, {
    method: "DELETE",
    auth: true,
    allowRetry: true,
  });
}

export async function createCommunityBoard(
  request: CreateCommunityBoardRequest,
) {
  return memberApiClient<CommunityBoard>(
    "/api/v1/user/community/boards",
    {
      method: "POST",
      auth: true,
      body: JSON.stringify(request),
    },
  );
}

export async function createCommunityReport(
  request: CreateCommunityReportRequest,
) {
  return memberApiClient<void>("/api/v1/user/community/reports", {
    method: "POST",
    auth: true,
    body: JSON.stringify(request),
  });
}

export async function updateCommunityBoard(
  boardId: number,
  request: CreateCommunityBoardRequest,
) {
  return memberApiClient<CommunityBoard>(
    `/api/v1/user/community/boards/${boardId}`,
    {
      method: "PUT",
      auth: true,
      allowRetry: true,
      body: JSON.stringify(request),
    },
  );
}