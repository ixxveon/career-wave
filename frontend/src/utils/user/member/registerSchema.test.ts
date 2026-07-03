// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  validateCompanyRegisterForm,
  validatePersonalRegisterForm,
  type CompanyRegisterFormSnapshot,
  type PersonalRegisterFormSnapshot,
} from './registerSchema';
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

// ─── 개인회원 이름 형식 검증 (#991) ───────────────────────────────────────────

const validPersonalSnapshot: PersonalRegisterFormSnapshot = {
  loginId: 'personaluser1',
  password: 'Password1!',
  passwordConfirm: 'Password1!',
  name: '홍길동',
  email: 'user@example.com',
  phone: '01012345678',
  emailVerificationToken: 'email-token',
  phoneVerificationToken: 'phone-token',
  emailCode: '123456',
  phoneCode: '654321',
  terms: { age: true, service: true, privacy: true, marketing: false },
};

describe('validatePersonalRegisterForm — 이름 형식 검증', () => {
  it('한글 실명이면 이름 오류가 없다', () => {
    const errors = validatePersonalRegisterForm(validPersonalSnapshot, LOGIN_ID_CHECK_STATE.AVAILABLE);
    expect(errors.name).toBeUndefined();
  });

  it('이름이 비어 있으면 입력 요청 오류가 발생한다', () => {
    const errors = validatePersonalRegisterForm(
      { ...validPersonalSnapshot, name: '  ' },
      LOGIN_ID_CHECK_STATE.AVAILABLE,
    );
    expect(errors.name).toBe('이름을 입력해주세요.');
  });

  it('한글이 아닌 값(sss)은 형식 오류가 발생한다', () => {
    const errors = validatePersonalRegisterForm(
      { ...validPersonalSnapshot, name: 'sss' },
      LOGIN_ID_CHECK_STATE.AVAILABLE,
    );
    expect(errors.name).toBe('이름은 2~10자 한글로 입력해 주세요.');
  });

  it('한 글자 한글은 형식 오류가 발생한다', () => {
    const errors = validatePersonalRegisterForm(
      { ...validPersonalSnapshot, name: '홍' },
      LOGIN_ID_CHECK_STATE.AVAILABLE,
    );
    expect(errors.name).toBe('이름은 2~10자 한글로 입력해 주세요.');
  });

  it('앞뒤 공백은 제거 후 검증되어 유효한 한글 이름은 통과한다', () => {
    const errors = validatePersonalRegisterForm(
      { ...validPersonalSnapshot, name: '  홍길동  ' },
      LOGIN_ID_CHECK_STATE.AVAILABLE,
    );
    expect(errors.name).toBeUndefined();
  });
});
