import { UserProfile, GithubProfile, ScrapJob } from "@/types/user/dashboard";

export const mockUserProfile: UserProfile = {
  memberId: "uuid-v4",
  loginId: "career_user01",
  email: "user@example.com",
  name: "홍길동",
  phone: "01012345678",
  roleType: "USER",
  memberStatus: "ACTIVE",
  subscriptionStatus: "FREE",
  notificationEnabled: true,
  createdAt: "2026-05-01T12:00:00Z",
};

export const mockGithubProfile: GithubProfile = {
  githubId: "careerwave-user",
  githubUrl: "https://github.com/careerwave-user",
  linked: true,
};

export const mockScrapJobs: ScrapJob[] = [
  {
    bookmarkId: 1,
    jobNoticeId: 101,
    companyName: "커리어웨이브",
    title: "프론트엔드 개발자 채용",
    careerLevel: "JUNIOR",
    location: "서울",
    deadline: "2026-06-30",
    noticeStatus: "ACTIVE",
    deleted: false,
    createdAt: "2026-05-20T10:00:00Z",
  },
  {
    bookmarkId: 2,
    jobNoticeId: 102,
    companyName: "네이버",
    title: "React Frontend Engineer",
    careerLevel: "JUNIOR",
    location: "성남",
    deadline: "2026-07-15",
    noticeStatus: "ACTIVE",
    deleted: false,
    createdAt: "2026-05-21T09:00:00Z",
  },
  {
    bookmarkId: 3,
    jobNoticeId: 103,
    companyName: "삭제된 기업",
    title: "삭제된 채용공고",
    careerLevel: "ANY",
    location: "정보 없음",
    deadline: "-",
    noticeStatus: "CLOSED",
    deleted: true,
    createdAt: "2026-05-19T09:00:00Z",
  },
];
