import { memberApiClient } from "@/api/user/member/memberApiClient";

import type {
  GithubProfile,
  ScrapJobPageResponse,
  UserProfile,
} from "@/types/user/dashboard";

export interface UpdateDashboardProfileRequest {
  name: string;
  phone: string;
  githubUrl: string;
}

export async function getDashboardProfile() {
  return memberApiClient<UserProfile>("/api/v1/user/dashboard/profile", {
    method: "GET",
    auth: true,
  });
}

export async function getDashboardGithubProfile() {
  return memberApiClient<GithubProfile>("/api/v1/user/dashboard/github", {
    method: "GET",
    auth: true,
  });
}

export async function updateDashboardProfile(
  request: UpdateDashboardProfileRequest,
) {
  return memberApiClient<UserProfile>("/api/v1/user/dashboard/profile", {
    method: "PATCH",
    auth: true,
    allowRetry: true,
    body: JSON.stringify(request),
  });
}

export async function getDashboardBookmarks(params?: {
  keyword?: string;
  page?: number;
  size?: number;
}) {
  const searchParams = new URLSearchParams();

  if (params?.keyword) {
    searchParams.set("keyword", params.keyword);
  }

  searchParams.set("page", String(params?.page ?? 0));
  searchParams.set("size", String(params?.size ?? 20));

  return memberApiClient<ScrapJobPageResponse>(
    `/api/v1/user/dashboard/bookmarks?${searchParams.toString()}`,
    {
      method: "GET",
      auth: true,
    },
  );
}

export async function deleteDashboardBookmark(bookmarkId: number) {
  return memberApiClient<void>(
    `/api/v1/user/dashboard/bookmarks/${bookmarkId}`,
    {
      method: "DELETE",
      auth: true,
      allowRetry: true,
    },
  );
}
