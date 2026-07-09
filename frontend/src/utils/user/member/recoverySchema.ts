import type {
  FindIdRequest,
  PasswordTokenRequest,
  ResetPasswordRequest,
  VerificationChannel,
} from '../../../types/user/member';
import {
  MEMBER_TYPE,
  VERIFICATION_CHANNEL,
} from '../../../types/user/member';
import { validatePasswordPolicy } from './passwordPolicy';
import {
  isValidBusinessNumber,
  isValidEmail,
  isValidPhone,
  isValidVerificationCode,
  normalizeBusinessNumber,
  normalizePhone,
} from './registerSchema';

export const RECOVERY_METHOD = {
  EMAIL: 'email',
  PHONE: 'phone',
} as const;

export type RecoveryMethod = (typeof RECOVERY_METHOD)[keyof typeof RECOVERY_METHOD];

export interface RecoveryFieldErrors {
  [field: string]: string;
}

export interface UserFindIdForm {
  email: string;
  phone: string;
  code: string;
}

export interface CompanyFindIdForm {
  managerName: string;
  businessNumber: string;
  email: string;
  code: string;
}

export interface UserFindPasswordForm {
  loginId: string;
  email: string;
  phone: string;
  code: string;
  nextPassword: string;
  nextPasswordConfirm: string;
}

export interface CompanyFindPasswordForm {
  loginId: string;
  managerName: string;
  businessNumber: string;
  email: string;
  code: string;
  nextPassword: string;
  nextPasswordConfirm: string;
}

export function hasRecoveryFieldErrors(errors: RecoveryFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function getVerificationChannel(method: RecoveryMethod): VerificationChannel {
  return method === RECOVERY_METHOD.PHONE
    ? VERIFICATION_CHANNEL.PHONE
    : VERIFICATION_CHANNEL.EMAIL;
}

export function getRecoveryTarget(method: RecoveryMethod, email: string, phone: string): string {
  return method === RECOVERY_METHOD.PHONE
    ? normalizePhone(phone)
    : email.trim();
}

export function validateUserRecoveryTarget(
  form: Pick<UserFindIdForm, 'email' | 'phone'>,
  method: RecoveryMethod,
): RecoveryFieldErrors {
  const errors: RecoveryFieldErrors = {};

  if (method === RECOVERY_METHOD.EMAIL) {
    if (!isValidEmail(form.email)) {
      errors.email = '올바른 이메일 주소를 입력해주세요.';
    }
  } else if (!isValidPhone(form.phone)) {
    errors.phone = '휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해주세요.';
  }

  return errors;
}

export function validateCompanyRecoveryTarget(
  form: Pick<CompanyFindIdForm, 'managerName' | 'businessNumber' | 'email'>,
): RecoveryFieldErrors {
  const errors: RecoveryFieldErrors = {};

  if (!form.managerName.trim()) errors.managerName = '담당자명을 입력해주세요.';
  if (!isValidBusinessNumber(form.businessNumber)) {
    errors.businessNumber = '사업자등록번호 10자리를 입력해주세요.';
  }
  if (!isValidEmail(form.email)) {
    errors.email = '담당자 이메일을 올바르게 입력해주세요.';
  }

  return errors;
}

export function validateVerificationConfirm(
  code: string,
  verificationId?: string,
): RecoveryFieldErrors {
  const errors: RecoveryFieldErrors = {};

  if (!verificationId?.trim()) {
    errors.code = '인증번호를 먼저 요청해주세요.';
    return errors;
  }

  if (!isValidVerificationCode(code)) {
    errors.code = '인증번호 6자리를 입력해주세요.';
  }

  return errors;
}

export function validateUserFindIdSubmission(
  form: UserFindIdForm,
  method: RecoveryMethod,
  verificationToken?: string,
): RecoveryFieldErrors {
  const errors = validateUserRecoveryTarget(form, method);

  if (!verificationToken?.trim()) {
    errors.code = '인증을 완료해주세요.';
  }

  return errors;
}

export function validateCompanyFindIdSubmission(
  form: CompanyFindIdForm,
  verificationToken?: string,
): RecoveryFieldErrors {
  const errors = validateCompanyRecoveryTarget(form);

  if (!verificationToken?.trim()) {
    errors.code = '이메일 인증을 완료해주세요.';
  }

  return errors;
}

export function validateUserPasswordTokenRequest(
  form: UserFindPasswordForm,
  method: RecoveryMethod,
  verificationToken?: string,
): RecoveryFieldErrors {
  const errors = validateUserRecoveryTarget(form, method);

  if (!form.loginId.trim()) {
    errors.loginId = '아이디를 입력해주세요.';
  }

  if (!verificationToken?.trim()) {
    errors.code = '인증을 완료해주세요.';
  }

  return errors;
}

export function validateCompanyPasswordTokenRequest(
  form: CompanyFindPasswordForm,
  verificationToken?: string,
): RecoveryFieldErrors {
  const errors = validateCompanyRecoveryTarget(form);

  if (!form.loginId.trim()) {
    errors.loginId = '아이디를 입력해주세요.';
  }

  if (!verificationToken?.trim()) {
    errors.code = '이메일 인증을 완료해주세요.';
  }

  return errors;
}

export function validateResetPassword(
  loginId: string,
  password: string,
  passwordConfirm: string,
  resetToken?: string,
): RecoveryFieldErrors {
  const errors: RecoveryFieldErrors = {};
  const passwordResult = validatePasswordPolicy(password, loginId);

  if (!resetToken?.trim()) {
    errors.form = '본인 인증을 다시 완료해주세요.';
  }

  if (!passwordResult.valid) {
    errors.nextPassword = passwordResult.errors[0];
  }

  if (password !== passwordConfirm) {
    errors.nextPasswordConfirm = '비밀번호가 일치하지 않습니다.';
  }

  return errors;
}

export function toFindIdRequest(
  roleType: 'company',
  verificationToken: string,
  companyForm: Pick<CompanyFindIdForm, 'managerName' | 'businessNumber'>,
): FindIdRequest;
export function toFindIdRequest(
  roleType: 'user',
  verificationToken: string,
): FindIdRequest;
export function toFindIdRequest(
  roleType: 'user' | 'company',
  verificationToken: string,
  companyForm?: Pick<CompanyFindIdForm, 'managerName' | 'businessNumber'>,
): FindIdRequest {
  if (roleType === 'company') {
    if (!companyForm) {
      throw new Error('기업회원 아이디 찾기에는 담당자명과 사업자등록번호가 필요합니다.');
    }

    return {
      roleType: MEMBER_TYPE.COMPANY,
      managerName: companyForm.managerName.trim(),
      businessNumber: normalizeBusinessNumber(companyForm.businessNumber),
      verificationToken: verificationToken.trim(),
    };
  }

  return {
    roleType: MEMBER_TYPE.USER,
    verificationToken: verificationToken.trim(),
  };
}

export function toPasswordTokenRequest(
  roleType: 'company',
  form: Pick<CompanyFindPasswordForm, 'loginId'>,
  verificationToken: string,
  companyIdentity: Pick<CompanyFindPasswordForm, 'managerName' | 'businessNumber'>,
): PasswordTokenRequest;
export function toPasswordTokenRequest(
  roleType: 'user',
  form: Pick<UserFindPasswordForm, 'loginId'>,
  verificationToken: string,
): PasswordTokenRequest;
export function toPasswordTokenRequest(
  roleType: 'user' | 'company',
  form: Pick<UserFindPasswordForm | CompanyFindPasswordForm, 'loginId'>,
  verificationToken: string,
  companyIdentity?: Pick<CompanyFindPasswordForm, 'managerName' | 'businessNumber'>,
): PasswordTokenRequest {
  if (roleType === 'company') {
    if (!companyIdentity) {
      throw new Error('기업회원 비밀번호 찾기에는 담당자명과 사업자등록번호가 필요합니다.');
    }

    return {
      roleType: MEMBER_TYPE.COMPANY,
      loginId: form.loginId.trim(),
      verificationToken: verificationToken.trim(),
      managerName: companyIdentity.managerName.trim(),
      businessNumber: normalizeBusinessNumber(companyIdentity.businessNumber),
    };
  }

  return {
    roleType: MEMBER_TYPE.USER,
    loginId: form.loginId.trim(),
    verificationToken: verificationToken.trim(),
  };
}

export function toResetPasswordRequest(
  resetToken: string,
  newPassword: string,
): ResetPasswordRequest {
  return {
    resetToken: resetToken.trim(),
    newPassword,
  };
}
