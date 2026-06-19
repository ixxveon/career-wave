import { MEMBER_TYPE, type MemberType } from '../../../types/user/member';
import { isPasswordConfirmed, validatePasswordPolicy } from './passwordPolicy';

export const BUSINESS_NUMBER_CHECK_STATE = {
  UNCHECKED: 'unchecked',
  CHECKING: 'checking',
  CONFIRMED: 'confirmed',  // valid=true (CONTINUING)
  REJECTED: 'rejected',    // valid=false (SUSPENDED/CLOSED/NOT_REGISTERED)
  ERROR: 'error',
} as const;

export type BusinessNumberCheckState = (typeof BUSINESS_NUMBER_CHECK_STATE)[keyof typeof BUSINESS_NUMBER_CHECK_STATE];

export const LOGIN_ID_CHECK_STATE = {
  UNCHECKED: 'unchecked',
  CHECKING: 'checking',
  AVAILABLE: 'available',
  DUPLICATED: 'duplicated',
  ERROR: 'error',
} as const;

export type LoginIdCheckState = (typeof LOGIN_ID_CHECK_STATE)[keyof typeof LOGIN_ID_CHECK_STATE];

export interface PersonalRegisterDraft {
  loginId: string;
  password: string;
  passwordConfirm: string;
  name: string;
  email: string;
  phone: string;
  emailVerificationToken?: string;
  phoneVerificationToken?: string;
  terms: {
    age: boolean;
    service: boolean;
    privacy: boolean;
    marketing: boolean;
  };
}

export interface CompanyRegisterDraft {
  loginId: string;
  password: string;
  passwordConfirm: string;
  managerName: string;
  managerEmail: string;
  managerEmailVerificationToken?: string;
  managerPhone: string;
  companyName: string;
  businessNumber: string;
  ceoName: string;
  postalCode: string;
  roadAddress: string;
  jibunAddress: string;
  addressDetail: string;
  isAgency: boolean;
  managerPhoneVerificationToken?: string;
  employmentCertificateFileId?: string;
  terms: {
    service: boolean;
    privacy: boolean;
    companyVerification: boolean;
    sms: boolean;
    marketing: boolean;
  };
}

export function toMemberType(value: string | null | undefined): MemberType {
  return value?.toUpperCase() === MEMBER_TYPE.COMPANY ? MEMBER_TYPE.COMPANY : MEMBER_TYPE.USER;
}

function hasValue(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function canSubmitLogin(loginId: string, password: string): boolean {
  return loginId.trim().length > 0 && password.length > 0;
}

export function canSubmitPersonalRegister(form: PersonalRegisterDraft, loginIdState: LoginIdCheckState): boolean {
  const password = validatePasswordPolicy(form.password, form.loginId);

  return (
    form.loginId.trim().length > 0 &&
    loginIdState === LOGIN_ID_CHECK_STATE.AVAILABLE &&
    password.valid &&
    isPasswordConfirmed(form.password, form.passwordConfirm) &&
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.phone.trim().length > 0 &&
    hasValue(form.emailVerificationToken) &&
    hasValue(form.phoneVerificationToken) &&
    form.terms.service &&
    form.terms.privacy
  );
}

export function canSubmitCompanyRegister(form: CompanyRegisterDraft, loginIdState: LoginIdCheckState): boolean {
  const password = validatePasswordPolicy(form.password, form.loginId);

  return (
    form.loginId.trim().length > 0 &&
    loginIdState === LOGIN_ID_CHECK_STATE.AVAILABLE &&
    password.valid &&
    isPasswordConfirmed(form.password, form.passwordConfirm) &&
    form.managerName.trim().length > 0 &&
    form.managerEmail.trim().length > 0 &&
    form.managerPhone.trim().length > 0 &&
    form.companyName.trim().length > 0 &&
    form.businessNumber.trim().length > 0 &&
    form.ceoName.trim().length > 0 &&
    form.postalCode.trim().length > 0 &&
    form.roadAddress.trim().length > 0 &&
    hasValue(form.managerEmailVerificationToken) &&
    hasValue(form.managerPhoneVerificationToken) &&
    hasValue(form.employmentCertificateFileId) &&
    form.terms.service &&
    form.terms.privacy &&
    form.terms.companyVerification &&
    form.terms.sms
  );
}
