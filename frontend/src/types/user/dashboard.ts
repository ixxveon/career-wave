import type { MemberStatus } from "@/types/user/member";

export type { MemberStatus } from "@/types/user/member";

export interface UserProfile {
  memberId: string;
  loginId: string;
  email: string | null;
  name: string;
  phone: string;
  roleType: "USER" | "COMPANY";
  memberStatus: MemberStatus;
  subscriptionStatus: "FREE" | "PREMIUM";
  notificationEnabled: boolean;
  createdAt: string;
}

export interface GithubProfile {
  githubId: string | null;
  githubUrl: string | null;
  linked: boolean;
}

export interface ScrapJob {
  bookmarkId: number;
  jobNoticeId: number;
  companyName: string;
  title: string;

  careerLevel: "JUNIOR" | "SENIOR" | "ANY";

  location: string;
  deadline: string;

  noticeStatus: "ACTIVE" | "CLOSED";

  deleted: boolean;
  createdAt: string;
}

export interface ScrapJobPageResponse {
  items: ScrapJob[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}
