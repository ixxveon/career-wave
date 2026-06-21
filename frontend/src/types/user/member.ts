import type { SocialProviderId } from '../../utils/user/member/socialAuth';

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

type NonRestrictedMemberStatus = typeof MEMBER_STATUS.ACTIVE | typeof MEMBER_STATUS.WITHDRAWN;

export const COMPANY_APPROVAL_STATUS = {
  NONE: 'NONE',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  NEEDS_REVISION: 'NEEDS_REVISION',
} as const;

export type CompanyApprovalStatus = (typeof COMPANY_APPROVAL_STATUS)[keyof typeof COMPANY_APPROVAL_STATUS];

export const MEMBER_SUBSCRIPTION_STATUS = {
  FREE: 'FREE',
  PREMIUM: 'PREMIUM',
} as const;

export type MemberSubscriptionStatus =
  (typeof MEMBER_SUBSCRIPTION_STATUS)[keyof typeof MEMBER_SUBSCRIPTION_STATUS];

export const VERIFICATION_CHANNEL = {
  EMAIL: 'EMAIL',
  PHONE: 'PHONE',
} as const;

export type VerificationChannel = (typeof VERIFICATION_CHANNEL)[keyof typeof VERIFICATION_CHANNEL];

export const VERIFICATION_PURPOSE = {
  REGISTER: 'REGISTER',
  FIND_ID: 'FIND_ID',
  RESET_PASSWORD: 'RESET_PASSWORD',
} as const;

export type VerificationPurpose = (typeof VERIFICATION_PURPOSE)[keyof typeof VERIFICATION_PURPOSE];

export type VerificationStatus =
  | 'SENT'
  | 'VERIFIED'
  | 'CONSUMED'
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
  code?: string;
  data?: T;
}

export interface MemberSummary {
  memberId: string;
  loginId: string;
  name: string;
  roleType: MemberType;
  memberStatus: MemberStatus;
  subscriptionStatus: MemberSubscriptionStatus;
  companyApprovalStatus: CompanyApprovalStatus;
  lastLoginAt: string | null;
}

export interface RestrictionSummary {
  restrictionType: Exclude<MemberStatus, NonRestrictedMemberStatus>;
  recoverable: boolean;
  availableAt: string | null;
  messageCode: string;
  reason: string | null;
  startedAt: string | null;
  duration: string | null;
}

export interface MemberStatusResponse {
  memberId: string;
  roleType: MemberType;
  memberStatus: MemberStatus;
  companyApprovalStatus: CompanyApprovalStatus;
  restriction: RestrictionSummary | null;
}

export interface LoginRequest {
  loginId: string;
  password: string;
  roleType: MemberType;
}

export interface LoginResponse {
  accessToken: string;
  member: MemberSummary;
}

export interface TokenRefreshResponse {
  accessToken: string;
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
  roleType: 'USER';
  memberStatus: MemberStatus;
}

export type { SocialProviderId };

export interface SocialRegisterTerms extends TermsAgreement {}

export interface SocialRegisterCompletionRequest {
  provider: SocialProviderId;
  socialSignupToken: string;
  socialEmail?: string;
  name: string;
  carrier: string;
  phone: string;
  phoneVerificationToken: string;
  terms: SocialRegisterTerms;
}

export interface SocialRegisterCompletionResponse {
  memberId: string;
  roleType: 'USER';
  memberStatus: MemberStatus;
  accessToken: string;
  nextPath: string;
}

export interface CompanyRegisterTerms extends TermsAgreement {
  companyVerification: boolean;
  sms: boolean;
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
  certificateNumber: string;
  postalCode: string;
  roadAddress: string;
  jibunAddress?: string;
  addressDetail?: string;
  companyType: CompanyType;
  isAgency: boolean;
  managerPhoneVerificationToken: string;
  managerEmailVerificationToken: string;
  employmentCertificateFileId: string;
  terms: CompanyRegisterTerms;
}

export interface CompanyRegisterResponse {
  memberId: string;
  companyProfileId: string;
  roleType: 'COMPANY';
  memberStatus: MemberStatus;
  companyApprovalStatus: CompanyApprovalStatus;
}

/** 사업자번호 사전 확인 — POST /company/business-number/check */
export interface CheckBusinessNumberRequest {
  businessNumber: string;
}

export const BUSINESS_STATUS = {
  CONTINUING:     'CONTINUING',
  SUSPENDED:      'SUSPENDED',
  CLOSED:         'CLOSED',
  NOT_REGISTERED: 'NOT_REGISTERED',
} as const;

export type BusinessStatus = (typeof BUSINESS_STATUS)[keyof typeof BUSINESS_STATUS];

export const BUSINESS_STATUS_LABELS: Record<BusinessStatus, string> = {
  [BUSINESS_STATUS.CONTINUING]:     '정상 영업 중인 사업자입니다.',
  [BUSINESS_STATUS.SUSPENDED]:      '휴업 중인 사업자입니다.',
  [BUSINESS_STATUS.CLOSED]:         '폐업한 사업자입니다.',
  [BUSINESS_STATUS.NOT_REGISTERED]: '등록되지 않은 사업자번호입니다.',
} as const;

export interface CheckBusinessNumberResponse {
  valid: boolean;
  businessStatus: BusinessStatus;
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
  roleType: MemberType;
  verificationToken: string;
  managerName?: string;
  businessNumber?: string;
}

export interface FindIdResponse {
  maskedLoginIds: string[];
  found: boolean;
}

export type PasswordTokenRequest =
  | {
      roleType: typeof MEMBER_TYPE.USER;
      loginId: string;
      verificationToken: string;
    }
  | {
      roleType: typeof MEMBER_TYPE.COMPANY;
      loginId: string;
      verificationToken: string;
      managerName: string;
      businessNumber: string;
    };

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

// ─── OAuth 소셜 로그인 ─────────────────────────────────────────────────────────

export interface OAuthAuthorizeResponse {
  provider: SocialProviderId;
  authorizationUrl: string;
  state: string;
}

/** OAuth callback — 기존 소셜 계정 로그인 성공 시 */
export interface OAuthCallbackLoginResponse {
  accessToken: string;
  member: MemberSummary;
  nextPath: string;
}

/** OAuth callback — 최초 소셜 사용자, 추가정보 입력 필요 시 */
export interface OAuthCallbackSignupRequiredResponse {
  provider: SocialProviderId;
  socialEmail: string | null;
  socialSignupToken: string;
  nextPath: string;
}

/** OAuth callback 응답 판별 타입가드 */
export function isOAuthCallbackLoginResponse(
  res: OAuthCallbackLoginResponse | OAuthCallbackSignupRequiredResponse,
): res is OAuthCallbackLoginResponse {
  return 'accessToken' in res;
}

export type LoginUiState = 'IDLE' | 'SUBMITTING' | 'AUTHENTICATED' | 'BLOCKED' | 'ERROR';

export type LoginRouteDecision =
  | { type: 'ALLOW'; path: string }
  | { type: 'BLOCK'; reason: 'COMPANY_PENDING' | 'COMPANY_REJECTED' | 'COMPANY_NEEDS_REVISION' | 'RESTRICTED' };
