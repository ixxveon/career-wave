import axiosInstance from '../../utils/axiosInstance';

// ── 공통 타입 ──────────────────────────────────────────────────

export const MEMBER_STATUS = { ACTIVE: 'ACTIVE', SUSPENDED: 'SUSPENDED', BANNED: 'BANNED', LOCKED: 'LOCKED', WITHDRAWN: 'WITHDRAWN' } as const;
export const MEMBER_ROLE = { ROLE_USER: 'ROLE_USER', ROLE_COMPANY: 'ROLE_COMPANY' } as const;
export const PLAN_TYPE = { FREE: 'FREE', PREMIUM: 'PREMIUM' } as const;
export const SANCTION_TYPE = { WARNING: 'WARNING', SUSPEND: 'SUSPEND', BLACKLIST: 'BLACKLIST' } as const;
export const SUSPEND_DURATION = { THREE_DAYS: 'THREE_DAYS', SEVEN_DAYS: 'SEVEN_DAYS', THIRTY_DAYS: 'THIRTY_DAYS', PERMANENT: 'PERMANENT' } as const;
export const HR_STATUS = { PENDING: 'PENDING', ACTIVE: 'ACTIVE', REMOVED: 'REMOVED' } as const;
export const PERMISSION_LEVEL = { FULL: 'FULL', NOTICE: 'NOTICE', VIEWER: 'VIEWER' } as const;

export type MemberStatus = typeof MEMBER_STATUS[keyof typeof MEMBER_STATUS];
export type MemberRole = typeof MEMBER_ROLE[keyof typeof MEMBER_ROLE];
export type PlanType = typeof PLAN_TYPE[keyof typeof PLAN_TYPE];
export type SanctionType = typeof SANCTION_TYPE[keyof typeof SANCTION_TYPE];
export type SuspendDuration = typeof SUSPEND_DURATION[keyof typeof SUSPEND_DURATION];
export type HrStatus = typeof HR_STATUS[keyof typeof HR_STATUS];
export type PermissionLevel = typeof PERMISSION_LEVEL[keyof typeof PERMISSION_LEVEL];

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

interface PageMeta {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

// ── 개인 회원 타입 ─────────────────────────────────────────────

export interface MemberItem {
  memberId: string;
  loginId: string;
  name: string;
  email: string;
  role: MemberRole;
  plan: PlanType;
  memberStatus: MemberStatus;
  warningCount: number;
  reportCount: number;
  joinedAt: string;
  lastLoginAt: string;
}

export interface MemberListData extends PageMeta {
  items: MemberItem[];
}

export interface MemberListParams {
  role?: MemberRole;
  status?: MemberStatus;
  plan?: PlanType;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export interface SanctionRequest {
  sanctionType: SanctionType;
  duration?: SuspendDuration;
  reason: string;
}

export interface SanctionResult {
  memberId: string;
  memberStatus: MemberStatus;
  sanctionType: SanctionType;
  duration: SuspendDuration | null;
  startDate: string;
  endDate: string | null;
}

// ── 기업 회원 타입 ─────────────────────────────────────────────

export interface HrManagerItem {
  memberId: string;
  hrName: string;
  email: string;
  companyName: string;
  certificateNumber: string;
  permissionLevel: PermissionLevel;
  certFileUrl: string;
  certFileName: string;
  joinedAt: string;
  approvedAt: string | null;
  hrStatus: HrStatus;
}

export interface HrManagerListData extends PageMeta {
  items: HrManagerItem[];
  pendingCount: number;
}

export interface HrManagerDetail extends HrManagerItem {
  rejectReason: string | null;
}

export interface HrManagerListParams {
  hrStatus?: HrStatus;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

export interface RejectRequest {
  rejectReason: string;
}

// ── API 함수 ───────────────────────────────────────────────────

export const memberApi = {
  // 개인 회원 목록 조회
  getMembers: (params?: MemberListParams) =>
    axiosInstance.get<ApiResponse<MemberListData>>('/api/v1/admin/members', { params }),

  // 개인 회원 상세 조회
  getMemberDetail: (memberId: string) =>
    axiosInstance.get<ApiResponse<MemberItem>>(`/api/v1/admin/members/${memberId}`),

  // 회원 제재 처리
  sanctionMember: (memberId: string, data: SanctionRequest) =>
    axiosInstance.post<ApiResponse<SanctionResult>>(`/api/v1/admin/members/${memberId}/sanctions`, data),

  // 기업 회원 목록 조회
  getHrManagers: (params?: HrManagerListParams) =>
    axiosInstance.get<ApiResponse<HrManagerListData>>('/api/v1/admin/hr-managers', { params }),

  // 기업 회원 상세 조회
  getHrManagerDetail: (memberId: string) =>
    axiosInstance.get<ApiResponse<HrManagerDetail>>(`/api/v1/admin/hr-managers/${memberId}`),

  // 기업 회원 승인
  approveHrManager: (memberId: string) =>
    axiosInstance.patch<ApiResponse<{ memberId: string; hrStatus: HrStatus; approvedAt: string }>>(
      `/api/v1/admin/hr-managers/${memberId}/approve`
    ),

  // 기업 회원 반려
  rejectHrManager: (memberId: string, data: RejectRequest) =>
    axiosInstance.patch<ApiResponse<{ memberId: string; hrStatus: HrStatus; rejectReason: string }>>(
      `/api/v1/admin/hr-managers/${memberId}/reject`,
      data
    ),
};
