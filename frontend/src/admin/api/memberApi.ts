import axiosInstance from '../../utils/axiosInstance';

// ── 공통 타입 ──────────────────────────────────────────────────

export type MemberStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type MemberRole = 'ROLE_USER' | 'ROLE_COMPANY';
export type PlanType = 'FREE' | 'PREMIUM';
export type SanctionType = 'WARNING' | 'SUSPEND' | 'BLACKLIST';
export type SuspendDuration = 'THREE_DAYS' | 'SEVEN_DAYS' | 'THIRTY_DAYS' | 'PERMANENT';
export type HrStatus = 'PENDING' | 'ACTIVE' | 'REMOVED';
export type PermissionLevel = 'FULL' | 'NOTICE' | 'VIEWER';

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
    axiosInstance.get<ApiResponse<MemberListData>>('/api/admin/members', { params }),

  // 개인 회원 상세 조회
  getMemberDetail: (memberId: string) =>
    axiosInstance.get<ApiResponse<MemberItem>>(`/api/admin/members/${memberId}`),

  // 회원 제재 처리
  sanctionMember: (memberId: string, data: SanctionRequest) =>
    axiosInstance.post<ApiResponse<SanctionResult>>(`/api/admin/members/${memberId}/sanctions`, data),

  // 기업 회원 목록 조회
  getHrManagers: (params?: HrManagerListParams) =>
    axiosInstance.get<ApiResponse<HrManagerListData>>('/api/admin/hr-managers', { params }),

  // 기업 회원 상세 조회
  getHrManagerDetail: (memberId: string) =>
    axiosInstance.get<ApiResponse<HrManagerDetail>>(`/api/admin/hr-managers/${memberId}`),

  // 기업 회원 승인
  approveHrManager: (memberId: string) =>
    axiosInstance.patch<ApiResponse<{ memberId: string; hrStatus: HrStatus; approvedAt: string }>>(
      `/api/admin/hr-managers/${memberId}/approve`
    ),

  // 기업 회원 반려
  rejectHrManager: (memberId: string, data: RejectRequest) =>
    axiosInstance.patch<ApiResponse<{ memberId: string; hrStatus: HrStatus; rejectReason: string }>>(
      `/api/admin/hr-managers/${memberId}/reject`,
      data
    ),
};
