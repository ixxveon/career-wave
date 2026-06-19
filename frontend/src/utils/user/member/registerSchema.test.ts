// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { validateCompanyRegisterForm, type CompanyRegisterFormSnapshot } from './registerSchema';
import { BUSINESS_NUMBER_CHECK_STATE, LOGIN_ID_CHECK_STATE } from './validation';

// ─── 최소 유효 스냅샷 (모든 필수 항목 충족) ────────────────────────────────────

const validFile = new File(['%PDF-1.0'], 'cert.pdf', { type: 'application/pdf' });

const validSnapshot: CompanyRegisterFormSnapshot = {
  companyType: '중소기업(300명 이하)',
  businessNumber: '1234567890',
  businessNumberCheckState: BUSINESS_NUMBER_CHECK_STATE.CONFIRMED,
  companyName: '카리어웨이브',
  ceoName: '홍길동',
  postalCode: '12345',
  roadAddress: '서울시 강남구',
  jibunAddress: '',
  addressDetail: '',
  isAgency: false,
  certificateNumber: 'CERT-001',
  loginId: 'companyuser01',
  password: 'Password1!',
  passwordConfirm: 'Password1!',
  managerName: '김담당',
  managerPhone: '01012345678',
  managerPhoneVerificationToken: 'phone-token',
  managerEmail: 'hr@company.com',
  managerEmailVerificationToken: 'email-token',
  managerPhoneCode: '123456',
  managerEmailCode: '654321',
  employmentCertificate: validFile,
  employmentCertificateFileId: 'stub-file-id-enough',
  terms: { service: true, privacy: true, companyVerification: true, sms: true, marketing: false },
};

// ─── 사업자번호 확인 상태 검증 ────────────────────────────────────────────────

describe('validateCompanyRegisterForm — businessNumberCheckState', () => {
  it('확인 완료(CONFIRMED) 시 businessNumber 오류가 없다', () => {
    const errors = validateCompanyRegisterForm(validSnapshot, LOGIN_ID_CHECK_STATE.AVAILABLE);
    expect(errors.businessNumber).toBeUndefined();
  });

  it('UNCHECKED 상태이면 확인 완료 오류가 발생한다', () => {
    const snapshot = { ...validSnapshot, businessNumberCheckState: BUSINESS_NUMBER_CHECK_STATE.UNCHECKED };
    const errors = validateCompanyRegisterForm(snapshot, LOGIN_ID_CHECK_STATE.AVAILABLE);
    expect(errors.businessNumber).toBe('사업자등록번호 확인을 완료해주세요.');
  });

  it('REJECTED 상태이면 확인 완료 오류가 발생한다', () => {
    const snapshot = { ...validSnapshot, businessNumberCheckState: BUSINESS_NUMBER_CHECK_STATE.REJECTED };
    const errors = validateCompanyRegisterForm(snapshot, LOGIN_ID_CHECK_STATE.AVAILABLE);
    expect(errors.businessNumber).toBe('사업자등록번호 확인을 완료해주세요.');
  });

  it('ERROR 상태이면 확인 완료 오류가 발생한다', () => {
    const snapshot = { ...validSnapshot, businessNumberCheckState: BUSINESS_NUMBER_CHECK_STATE.ERROR };
    const errors = validateCompanyRegisterForm(snapshot, LOGIN_ID_CHECK_STATE.AVAILABLE);
    expect(errors.businessNumber).toBe('사업자등록번호 확인을 완료해주세요.');
  });

  it('10자리 미만 사업자번호는 형식 오류가 우선 발생한다', () => {
    const snapshot = {
      ...validSnapshot,
      businessNumber: '12345',
      businessNumberCheckState: BUSINESS_NUMBER_CHECK_STATE.UNCHECKED,
    };
    const errors = validateCompanyRegisterForm(snapshot, LOGIN_ID_CHECK_STATE.AVAILABLE);
    expect(errors.businessNumber).toBe('사업자등록번호 10자리를 입력해주세요.');
  });
});

// ─── 전체 유효 스냅샷은 오류 없음 ─────────────────────────────────────────────

describe('validateCompanyRegisterForm — 유효 케이스', () => {
  it('모든 필드가 유효하면 오류가 없다', () => {
    const errors = validateCompanyRegisterForm(validSnapshot, LOGIN_ID_CHECK_STATE.AVAILABLE);
    expect(Object.keys(errors)).toHaveLength(0);
  });
});
