export const MEMBER_TYPE = {
  USER: 'USER',
  COMPANY: 'COMPANY',
} as const;

export type MemberType = (typeof MEMBER_TYPE)[keyof typeof MEMBER_TYPE];

export const MEMBER_STATUS = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  BANNED: 'BANNED',
  LOCKED: 'LOCKED',
  WITHDRAWN: 'WITHDRAWN',
  BLACKLISTED: 'BLACKLISTED',
} as const;

export type MemberStatus = (typeof MEMBER_STATUS)[keyof typeof MEMBER_STATUS];

export const COMPANY_APPROVAL_STATUS = {
  NONE: 'NONE',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NEEDS_REVISION: 'NEEDS_REVISION',
} as const;

export type CompanyApprovalStatus = (typeof COMPANY_APPROVAL_STATUS)[keyof typeof COMPANY_APPROVAL_STATUS];

export type VerificationChannel = 'EMAIL' | 'PHONE';

export type VerificationPurpose = 'REGISTER' | 'FIND_ID' | 'RESET_PASSWORD';

export type VerificationStatus =
  | 'SENT'
  | 'VERIFIED'
  | 'EXPIRED'
  | 'FAILED'
  | 'RATE_LIMITED';

export type CompanyType =
  | 'ENTERPRISE'
  | 'SUBSIDIARY'
  | 'SME'
  | 'MID_MARKET'
  | 'VENTURE'
  | 'FOREIGN_INVESTED'
  | 'FOREIGN_CORPORATION'
  | 'PUBLIC'
  | 'NON_PROFIT'
  | 'FOREIGN_NON_PROFIT';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface ApiErrorBody<T = unknown> {
  success?: false;
  statusCode?: number;
  message?: string;
  data?: T;
}

export interface MemberSummary {
  memberId: string;
  loginId: string;
  name: string;
  memberType: MemberType;
  memberStatus: MemberStatus;
  companyApprovalStatus: CompanyApprovalStatus;
  lastLoginAt: string | null;
}

export interface RestrictionSummary {
  restrictionType: Exclude<MemberStatus, 'ACTIVE' | 'WITHDRAWN'>;
  recoverable: boolean;
  availableAt: string | null;
  messageCode: string;
}

export interface MemberStatusResponse {
  memberId: string;
  memberType: MemberType;
  memberStatus: MemberStatus;
  companyApprovalStatus: CompanyApprovalStatus;
  restriction: RestrictionSummary | null;
}

export interface LoginRequest {
  loginId: string;
  password: string;
  memberType: MemberType;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  member: MemberSummary;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

export interface CheckLoginIdResponse {
  available: boolean;
}

export interface TermsAgreement {
  service: boolean;
  privacy: boolean;
  marketing: boolean;
}

export interface UserRegisterRequest {
  loginId: string;
  password: string;
  name: string;
  email: string;
  phone: string;
  emailVerificationToken: string;
  phoneVerificationToken: string;
  terms: TermsAgreement;
}

export interface UserRegisterResponse {
  memberId: string;
  memberType: 'USER';
  memberStatus: MemberStatus;
}

export interface CompanyRegisterTerms extends TermsAgreement {
  companyVerification: boolean;
}

export interface CompanyRegisterRequest {
  loginId: string;
  password: string;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
  companyName: string;
  businessNumber: string;
  ceoName: string;
  address: string;
  addressDetail: string;
  companyType: CompanyType;
  isAgency: boolean;
  managerVerificationToken: string;
  employmentCertificateFileId: string;
  terms: CompanyRegisterTerms;
}

export interface CompanyRegisterResponse {
  memberId: string;
  companyProfileId: string;
  memberType: 'COMPANY';
  memberStatus: MemberStatus;
  companyApprovalStatus: CompanyApprovalStatus;
}

export interface EmploymentCertificateUploadResponse {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface SendVerificationRequest {
  channel: VerificationChannel;
  target: string;
  purpose: VerificationPurpose;
}

export interface SendVerificationResponse {
  verificationId: string;
  expiresAt: string;
  resendAvailableAt: string;
  remainingAttempts: number;
}

export interface ConfirmVerificationRequest {
  verificationId: string;
  code: string;
}

export interface ConfirmVerificationResponse {
  verificationToken: string;
  verifiedAt: string;
}

export interface FindIdRequest {
  memberType: MemberType;
  verificationToken: string;
  managerName?: string;
  businessNumber?: string;
}

export interface FindIdResponse {
  maskedLoginIds: string[];
  found: boolean;
}

export interface PasswordTokenRequest {
  memberType: MemberType;
  loginId: string;
  verificationToken: string;
}

export interface PasswordTokenResponse {
  resetToken: string;
  expiresAt: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  changedAt: string;
}

export type LoginUiState = 'IDLE' | 'SUBMITTING' | 'AUTHENTICATED' | 'BLOCKED' | 'ERROR';

export type LoginRouteDecision =
  | { type: 'ALLOW'; path: string }
  | { type: 'BLOCK'; reason: 'COMPANY_PENDING' | 'COMPANY_REJECTED' | 'COMPANY_NEEDS_REVISION' | 'RESTRICTED' };
