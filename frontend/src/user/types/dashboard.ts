export interface UserProfile {
  memberId: string;
  loginId: string;
  email: string;
  name: string;
  phone: string;
  roleType: string;
  memberStatus: string;
  subscriptionStatus: string;
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
  content: ScrapJob[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
