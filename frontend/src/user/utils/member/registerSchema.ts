import type {
  CompanyRegisterRequest,
  CompanyRegisterTerms,
  CompanyType,
  TermsAgreement,
  UserRegisterRequest,
} from '../../types/member';
import { validateEmploymentCertificateFile } from './fileValidation';
import { validatePasswordPolicy } from './passwordPolicy';
import { LOGIN_ID_CHECK_STATE, type CompanyRegisterDraft, type LoginIdCheckState, type PersonalRegisterDraft } from './validation';

export const LOGIN_ID_PATTERN = /^[A-Za-z0-9]{6,20}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^010\d{8}$/;
export const VERIFICATION_CODE_PATTERN = /^\d{6}$/;

export const COMPANY_TYPE_LABELS = {
  ENTERPRISE: '대기업',
  SUBSIDIARY: '대기업 계열사·자회사',
  SME: '중소기업(300명 이하)',
  MID_MARKET: '중견기업(300명 이상)',
  VENTURE: '벤처기업',
  FOREIGN_INVESTED: '외국계(외국 투자기업)',
  FOREIGN_CORPORATION: '외국계(외국 법인기업)',
  PUBLIC: '국내 공공기관·공기업',
  NON_PROFIT: '비영리단체·협회·교육재단',
  FOREIGN_NON_PROFIT: '외국 기관·비영리기구·단체',
} as const;

export const COMPANY_TYPE_BY_LABEL: Record<string, CompanyType> = {
  [COMPANY_TYPE_LABELS.ENTERPRISE]: 'ENTERPRISE',
  [COMPANY_TYPE_LABELS.SUBSIDIARY]: 'SUBSIDIARY',
  [COMPANY_TYPE_LABELS.SME]: 'SME',
  [COMPANY_TYPE_LABELS.MID_MARKET]: 'MID_MARKET',
  [COMPANY_TYPE_LABELS.VENTURE]: 'VENTURE',
  [COMPANY_TYPE_LABELS.FOREIGN_INVESTED]: 'FOREIGN_INVESTED',
  [COMPANY_TYPE_LABELS.FOREIGN_CORPORATION]: 'FOREIGN_CORPORATION',
  [COMPANY_TYPE_LABELS.PUBLIC]: 'PUBLIC',
  [COMPANY_TYPE_LABELS.NON_PROFIT]: 'NON_PROFIT',
  [COMPANY_TYPE_LABELS.FOREIGN_NON_PROFIT]: 'FOREIGN_NON_PROFIT',
} as const;

export interface RegisterFieldErrors {
  [field: string]: string;
}

export interface PersonalRegisterFormSnapshot extends PersonalRegisterDraft {
  emailCode: string;
  phoneCode: string;
}

export interface CompanyRegisterFormSnapshot extends CompanyRegisterDraft {
  companyType: string;
  certificateNumber: string;
  managerEmailVerificationToken?: string;
  managerPhoneCode: string;
  managerEmailCode: string;
  employmentCertificate: File | null;
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidLoginId(value: string): boolean {
  return LOGIN_ID_PATTERN.test(value.trim());
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(normalizePhone(value));
}

export function isValidVerificationCode(value: string): boolean {
  return VERIFICATION_CODE_PATTERN.test(value.trim());
}

export function validatePersonalRegisterForm(
  form: PersonalRegisterFormSnapshot,
  loginIdState: LoginIdCheckState,
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const password = validatePasswordPolicy(form.password, form.loginId);

  if (!isValidLoginId(form.loginId)) errors.loginId = '아이디는 영문과 숫자 조합 6~20자로 입력해주세요.';
  if (loginIdState !== LOGIN_ID_CHECK_STATE.AVAILABLE) errors.loginId = '아이디 중복 확인을 완료해주세요.';
  if (!form.name.trim()) errors.name = '이름을 입력해주세요.';
  if (!isValidEmail(form.email)) errors.email = '올바른 이메일 주소를 입력해주세요.';
  if (!form.emailVerificationToken?.trim()) errors.emailCode = '이메일 인증을 완료해주세요.';
  if (!isValidPhone(form.phone)) errors.phone = '휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해주세요.';
  if (!form.phoneVerificationToken?.trim()) errors.phoneCode = '휴대폰 인증을 완료해주세요.';
  if (!password.valid) errors.password = password.errors[0];
  if (form.password !== form.passwordConfirm) errors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
  if (!form.terms.service || !form.terms.privacy) errors.terms = '필수 약관에 동의해주세요.';

  return errors;
}

export function validateCompanyRegisterForm(
  form: CompanyRegisterFormSnapshot,
  loginIdState: LoginIdCheckState,
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const password = validatePasswordPolicy(form.password, form.loginId);

  if (!COMPANY_TYPE_BY_LABEL[form.companyType]) errors.companyType = '기업형태를 선택해주세요.';
  if (!/^\d{10}$/.test(form.businessNumber.trim())) errors.businessNumber = '사업자등록번호 10자리를 입력해주세요.';
  if (!form.companyName.trim()) errors.companyName = '회사명을 입력해주세요.';
  if (!form.ceoName.trim()) errors.ceoName = '대표자명을 입력해주세요.';
  if (!form.address.trim()) errors.address = '회사주소를 입력해주세요.';
  if (!form.certificateNumber.trim()) errors.certificateNumber = '기업인증을 완료해주세요.';
  if (!isValidLoginId(form.loginId)) errors.loginId = '아이디는 영문과 숫자 조합 6~20자로 입력해주세요.';
  if (loginIdState !== LOGIN_ID_CHECK_STATE.AVAILABLE) errors.loginId = '아이디 중복 확인을 완료해주세요.';
  if (!form.managerName.trim()) errors.managerName = '담당자명을 입력해주세요.';
  if (!isValidPhone(form.managerPhone)) errors.managerPhone = '담당자 전화번호를 올바르게 입력해주세요.';
  if (!form.managerVerificationToken?.trim()) errors.managerPhoneCode = '담당자 휴대폰 인증을 완료해주세요.';
  if (!isValidEmail(form.managerEmail)) errors.managerEmail = '담당자 이메일을 올바르게 입력해주세요.';
  if (!form.managerEmailVerificationToken?.trim()) errors.managerEmailCode = '담당자 이메일 인증을 완료해주세요.';
  if (!password.valid) errors.password = password.errors[0];
  if (form.password !== form.passwordConfirm) errors.passwordConfirm = '비밀번호가 일치하지 않습니다.';

  if (!form.employmentCertificate) {
    errors.employmentCertificate = '재직증명서 PDF 파일을 업로드해주세요.';
  } else {
    const fileValidation = validateEmploymentCertificateFile(form.employmentCertificate);
    if (!fileValidation.valid) errors.employmentCertificate = fileValidation.message ?? '재직증명서 파일을 확인해주세요.';
  }

  if (!form.terms.service || !form.terms.privacy || !form.terms.companyVerification) {
    errors.terms = '필수 약관에 동의해주세요.';
  }

  return errors;
}

export function toUserRegisterRequest(form: PersonalRegisterFormSnapshot): UserRegisterRequest {
  const terms: TermsAgreement = {
    service: form.terms.service,
    privacy: form.terms.privacy,
    marketing: form.terms.marketing,
  };

  return {
    loginId: form.loginId.trim(),
    password: form.password,
    name: form.name.trim(),
    email: form.email.trim(),
    phone: normalizePhone(form.phone),
    emailVerificationToken: form.emailVerificationToken?.trim() ?? '',
    phoneVerificationToken: form.phoneVerificationToken?.trim() ?? '',
    terms,
  };
}

export function toCompanyRegisterRequest(form: CompanyRegisterFormSnapshot): CompanyRegisterRequest {
  const terms: CompanyRegisterTerms = {
    service: form.terms.service,
    privacy: form.terms.privacy,
    companyVerification: form.terms.companyVerification,
    marketing: form.terms.marketing,
  };

  return {
    loginId: form.loginId.trim(),
    password: form.password,
    managerName: form.managerName.trim(),
    managerEmail: form.managerEmail.trim(),
    managerPhone: normalizePhone(form.managerPhone),
    companyName: form.companyName.trim(),
    businessNumber: form.businessNumber.trim(),
    ceoName: form.ceoName.trim(),
    address: form.address.trim(),
    addressDetail: form.addressDetail.trim(),
    companyType: COMPANY_TYPE_BY_LABEL[form.companyType],
    isAgency: form.isAgency,
    managerVerificationToken: form.managerVerificationToken?.trim() ?? '',
    employmentCertificateFileId: form.employmentCertificateFileId?.trim() ?? '',
    terms,
  };
}
