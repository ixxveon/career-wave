import { useRef, useState, type ChangeEvent } from 'react';

declare global {
  interface Window {
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: { zonecode: string; roadAddress: string; jibunAddress: string }) => void;
      }) => { open: () => void };
    };
  }
}
import { BUSINESS_STATUS_LABELS, VERIFICATION_CHANNEL, VERIFICATION_PURPOSE } from '../../../types/user/member';
import { BUSINESS_NUMBER_CHECK_STATE, type BusinessNumberCheckState } from '../../../utils/user/member/validation';
import { validateEmploymentCertificateFile } from '../../../utils/user/member/fileValidation';
import {
  isValidEmail,
  isValidLoginId,
  isValidPhone,
  isValidVerificationCode,
  toCompanyRegisterRequest,
  validateCompanyRegisterForm,
  type RegisterFieldErrors,
} from '../../../utils/user/member/registerSchema';
import { getRecoveryErrorMessage, getRemainingSeconds } from '../../../utils/user/member/recoveryView';
import { LOGIN_ID_CHECK_STATE, type LoginIdCheckState } from '../../../utils/user/member/validation';
import {
  useCheckBusinessNumber,
  useConfirmVerificationCode,
  useLoginIdCheck,
  useRegisterCompany,
  useSendVerificationCode,
  useUploadEmploymentCertificate,
  useVerificationNow,
} from './index';

const initialCompanyForm = {
  companyType: '',
  businessNumber: '',
  companyName: '',
  ceoName: '',
  postalCode: '',
  roadAddress: '',
  jibunAddress: '',
  addressDetail: '',
  isAgency: false,
  managerId: '',
  managerPassword: '',
  managerPasswordConfirm: '',
  managerName: '',
  managerPhone: '',
  managerPhoneCode: '',
  managerEmail: '',
  managerEmailCode: '',
};

const initialCompanyTerms = {
  service: false,
  companyVerification: false,
  sms: false,
  privacy: false,
  marketing: false,
};

type CompanyForm = typeof initialCompanyForm;
type CompanyFormKey = keyof CompanyForm;

// ── 책임 경계 ────────────────────────────────────────────────────
// §1 기업 정보 폼 (사업자번호·주소·대표자 등) 상태 관리
// §2 담당자 인증번호 발송/확인 (휴대폰 + 이메일 2채널)
// §3 재직증명서 PDF 업로드 및 유효성 검증
// §4 기업회원 가입 제출 (handleSubmit)
// 인증 stale guard ref가 폼 상태와 결합되어 있어 단일 훅으로 유지한다.
// ─────────────────────────────────────────────────────────────────
export function useCompanyRegisterForm() {
  const [form, setForm] = useState<CompanyForm>(initialCompanyForm);
  const [terms, setTerms] = useState(initialCompanyTerms);
  const currentLoginIdRef = useRef(form.managerId);
  const currentBusinessNumberRef = useRef(form.businessNumber);
  const currentManagerPhoneRef = useRef(form.managerPhone);
  const currentManagerEmailRef = useRef(form.managerEmail);
  const managerPhoneVerificationIdRef = useRef('');
  const managerEmailVerificationIdRef = useRef('');
  const managerPhoneVerificationRequestRef = useRef(0);
  const managerEmailVerificationRequestRef = useRef(0);
  const [employmentCertificate, setEmploymentCertificate] = useState<File | null>(null);
  const currentEmploymentCertificateRef = useRef<File | null>(null);
  const [employmentCertificateError, setEmploymentCertificateError] = useState('');
  const [loginIdState, setLoginIdState] = useState<LoginIdCheckState>(LOGIN_ID_CHECK_STATE.UNCHECKED);
  const [businessNumberCheckState, setBusinessNumberCheckState] = useState<BusinessNumberCheckState>(BUSINESS_NUMBER_CHECK_STATE.UNCHECKED);
  const [businessNumberCheckMessage, setBusinessNumberCheckMessage] = useState('');
  const [verification, setVerification] = useState({
    phoneId: '',
    phoneToken: '',
    phoneExpiresAt: '',
    phoneResendAvailableAt: '',
    phoneRemainingAttempts: 0,
    emailId: '',
    emailToken: '',
    emailExpiresAt: '',
    emailResendAvailableAt: '',
    emailRemainingAttempts: 0,
    employmentCertificateFileId: '',
  });
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formMessage, setFormMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitGuideOpen, setIsSubmitGuideOpen] = useState(false);
  const employmentCertificateInputRef = useRef<HTMLInputElement | null>(null);
  const checkBusinessNumber = useCheckBusinessNumber();
  const checkLoginId = useLoginIdCheck();
  const sendPhoneCode = useSendVerificationCode();
  const confirmPhoneCode = useConfirmVerificationCode();
  const sendEmailCode = useSendVerificationCode();
  const confirmEmailCode = useConfirmVerificationCode();
  const uploadEmploymentCertificate = useUploadEmploymentCertificate();
  const registerCompany = useRegisterCompany();
  const now = useVerificationNow();
  const passwordMismatch = form.managerPasswordConfirm && form.managerPassword !== form.managerPasswordConfirm;
  const phoneExpiresIn = getRemainingSeconds(verification.phoneExpiresAt, now);
  const phoneResendIn = getRemainingSeconds(verification.phoneResendAvailableAt, now);
  const emailExpiresIn = getRemainingSeconds(verification.emailExpiresAt, now);
  const emailResendIn = getRemainingSeconds(verification.emailResendAvailableAt, now);
  const companySnapshot = {
    loginId: form.managerId,
    password: form.managerPassword,
    passwordConfirm: form.managerPasswordConfirm,
    managerName: form.managerName,
    managerEmail: form.managerEmail,
    managerEmailVerificationToken: verification.emailToken,
    managerPhone: form.managerPhone,
    managerPhoneVerificationToken: verification.phoneToken,
    companyName: form.companyName,
    businessNumber: form.businessNumber,
    ceoName: form.ceoName,
    postalCode: form.postalCode,
    roadAddress: form.roadAddress,
    jibunAddress: form.jibunAddress,
    addressDetail: form.addressDetail,
    isAgency: form.isAgency,
    companyType: form.companyType,
    managerPhoneCode: form.managerPhoneCode,
    managerEmailCode: form.managerEmailCode,
    employmentCertificate,
    employmentCertificateFileId: verification.employmentCertificateFileId,
    businessNumberCheckState,
    terms: {
      service: terms.service,
      privacy: terms.privacy,
      companyVerification: terms.companyVerification,
      sms: terms.sms,
      marketing: terms.marketing,
    },
  };
  const canSubmit =
    Object.keys(validateCompanyRegisterForm(companySnapshot, loginIdState)).length === 0 &&
    !uploadEmploymentCertificate.isPending &&
    !registerCompany.isPending;

  const update = (key: CompanyFormKey, value: CompanyForm[CompanyFormKey]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'managerPhone' ? { managerPhoneCode: '' } : {}),
      ...(key === 'managerEmail' ? { managerEmailCode: '' } : {}),
    }));
    setFieldErrors((current) => ({
      ...current,
      [key]: '',
      ...(key === 'managerId' ? { loginId: '' } : {}),
    }));
    setFormMessage('');
    setSuccessMessage('');

    if (key === 'managerId') setLoginIdState(LOGIN_ID_CHECK_STATE.UNCHECKED);
    if (key === 'businessNumber') {
      currentBusinessNumberRef.current = typeof value === 'string' ? value : currentBusinessNumberRef.current;
      setBusinessNumberCheckState(BUSINESS_NUMBER_CHECK_STATE.UNCHECKED);
      setBusinessNumberCheckMessage('');
    }
    if (key === 'managerId') currentLoginIdRef.current = typeof value === 'string' ? value : currentLoginIdRef.current;
    if (key === 'managerPhone') {
      currentManagerPhoneRef.current = typeof value === 'string' ? value : currentManagerPhoneRef.current;
      managerPhoneVerificationIdRef.current = '';
      setVerification((current) => ({
        ...current,
        phoneId: '',
        phoneToken: '',
        phoneExpiresAt: '',
        phoneResendAvailableAt: '',
        phoneRemainingAttempts: 0,
      }));
    }
    if (key === 'managerEmail') {
      currentManagerEmailRef.current = typeof value === 'string' ? value : currentManagerEmailRef.current;
      managerEmailVerificationIdRef.current = '';
      setVerification((current) => ({
        ...current,
        emailId: '',
        emailToken: '',
        emailExpiresAt: '',
        emailResendAvailableAt: '',
        emailRemainingAttempts: 0,
      }));
    }
  };

  const DAUM_POSTCODE_SCRIPT_ID = 'daum-postcode-script';

  const handleAddressSearch = () => {
    const openPopup = () => {
      const Postcode = window.daum?.Postcode;
      if (!Postcode) {
        setFormMessage('주소 검색 서비스를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }
      new Postcode({
        oncomplete: (data) => {
          setForm((current) => ({
            ...current,
            postalCode: data.zonecode,
            roadAddress: data.roadAddress,
            jibunAddress: data.jibunAddress ?? '',
          }));
          setFieldErrors((current) => ({ ...current, roadAddress: '' }));
          setFormMessage('');
          setSuccessMessage('');
        },
      }).open();
    };

    if (window.daum?.Postcode) {
      openPopup();
      return;
    }

    const existing = document.getElementById(DAUM_POSTCODE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', openPopup, { once: true });
      existing.addEventListener('error', () => {
        setFormMessage('주소 검색 스크립트를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = DAUM_POSTCODE_SCRIPT_ID;
    script.async = true;
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.onload = openPopup;
    script.onerror = () => {
      setFormMessage('주소 검색 스크립트를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    };
    document.head.appendChild(script);
  };

  const handleCertificateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setEmploymentCertificate(null);
      currentEmploymentCertificateRef.current = null;
      setEmploymentCertificateError('');
      return;
    }

    const fileValidation = validateEmploymentCertificateFile(selectedFile);

    if (!fileValidation.valid) {
      setEmploymentCertificate(null);
      currentEmploymentCertificateRef.current = null;
      setEmploymentCertificateError(fileValidation.message ?? '재직증명서 파일을 확인해주세요.');
      setVerification((current) => ({ ...current, employmentCertificateFileId: '' }));
      event.target.value = '';
      return;
    }

    setEmploymentCertificate(selectedFile);
    currentEmploymentCertificateRef.current = selectedFile;
    setVerification((current) => ({ ...current, employmentCertificateFileId: '' }));
    setEmploymentCertificateError('');
    setFieldErrors((current) => ({ ...current, employmentCertificate: '', employmentCertificateFileId: '' }));
  };

  const handleBusinessNumberCheck = async () => {
    const bn = form.businessNumber.trim();
    if (!/^\d{10}$/.test(bn)) {
      setFieldErrors((current) => ({ ...current, businessNumber: '사업자등록번호 10자리를 입력해주세요.' }));
      return;
    }
    setBusinessNumberCheckState(BUSINESS_NUMBER_CHECK_STATE.CHECKING);
    setBusinessNumberCheckMessage('');
    try {
      const result = await checkBusinessNumber.mutateAsync({ businessNumber: bn });
      // stale guard — 조회 중 번호가 변경되면 구 결과 무시
      if (bn !== currentBusinessNumberRef.current.trim()) return;
      const label = BUSINESS_STATUS_LABELS[result.businessStatus] ?? result.businessStatus;
      setBusinessNumberCheckState(result.valid ? BUSINESS_NUMBER_CHECK_STATE.CONFIRMED : BUSINESS_NUMBER_CHECK_STATE.REJECTED);
      setBusinessNumberCheckMessage(label);
      setFieldErrors((current) => ({
        ...current,
        businessNumber: result.valid ? '' : label,
      }));
    } catch (error) {
      if (bn !== currentBusinessNumberRef.current.trim()) return;
      setBusinessNumberCheckState(BUSINESS_NUMBER_CHECK_STATE.ERROR);
      setBusinessNumberCheckMessage('사업자 확인 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해주세요.');
      setFieldErrors((current) => ({ ...current, businessNumber: getRecoveryErrorMessage(error, '사업자 확인에 실패했습니다.') }));
    }
  };

  const handleLoginIdCheck = async () => {
    if (!isValidLoginId(form.managerId)) {
      setLoginIdState(LOGIN_ID_CHECK_STATE.ERROR);
      setFieldErrors((current) => ({ ...current, loginId: '아이디는 영문과 숫자 조합 6~20자로 입력해주세요.' }));
      return;
    }

    const requestedLoginId = form.managerId.trim();
    setLoginIdState(LOGIN_ID_CHECK_STATE.CHECKING);
    try {
      const result = await checkLoginId.mutateAsync(requestedLoginId);
      if (requestedLoginId !== currentLoginIdRef.current.trim()) return;
      setLoginIdState(result.available ? LOGIN_ID_CHECK_STATE.AVAILABLE : LOGIN_ID_CHECK_STATE.DUPLICATED);
      setFieldErrors((current) => ({
        ...current,
        loginId: result.available ? '' : '이미 사용 중인 아이디입니다.',
      }));
    } catch (error) {
      if (requestedLoginId !== currentLoginIdRef.current.trim()) return;
      setFieldErrors((current) => ({ ...current, loginId: getRecoveryErrorMessage(error, '아이디 중복 확인에 실패했습니다.') }));
      setLoginIdState(LOGIN_ID_CHECK_STATE.ERROR);
    }
  };

  const handleSendPhoneCode = async () => {
    if (!isValidPhone(form.managerPhone)) {
      setFieldErrors((current) => ({ ...current, managerPhone: '담당자 전화번호를 올바르게 입력해주세요.' }));
      return;
    }

    const target = form.managerPhone.replace(/\D/g, '');
    const requestOrder = ++managerPhoneVerificationRequestRef.current;
    try {
      const result = await sendPhoneCode.mutateAsync({
        channel: VERIFICATION_CHANNEL.PHONE,
        target,
        purpose: VERIFICATION_PURPOSE.REGISTER,
      });
      if (requestOrder !== managerPhoneVerificationRequestRef.current || target !== currentManagerPhoneRef.current.replace(/\D/g, '')) return;
      managerPhoneVerificationIdRef.current = result.verificationId;
      setVerification((current) => ({
        ...current,
        phoneId: result.verificationId,
        phoneToken: '',
        phoneExpiresAt: result.expiresAt,
        phoneResendAvailableAt: result.resendAvailableAt,
        phoneRemainingAttempts: result.remainingAttempts,
      }));
      setFieldErrors((current) => ({ ...current, managerPhone: '', managerPhoneCode: '' }));
    } catch (error) {
      if (requestOrder !== managerPhoneVerificationRequestRef.current || target !== currentManagerPhoneRef.current.replace(/\D/g, '')) return;
      setFieldErrors((current) => ({ ...current, managerPhone: getRecoveryErrorMessage(error, '휴대폰 인증번호 발송에 실패했습니다.') }));
    }
  };

  const handleConfirmPhoneCode = async () => {
    const verificationId = managerPhoneVerificationIdRef.current;
    const target = currentManagerPhoneRef.current.replace(/\D/g, '');

    if (!verificationId) {
      setFieldErrors((current) => ({ ...current, managerPhoneCode: '휴대폰 인증번호를 먼저 요청해주세요.' }));
      return;
    }
    if (phoneExpiresIn <= 0) {
      setFieldErrors((current) => ({ ...current, managerPhoneCode: '인증번호가 만료되었습니다. 다시 전송해주세요.' }));
      return;
    }
    if (!isValidVerificationCode(form.managerPhoneCode)) {
      setFieldErrors((current) => ({ ...current, managerPhoneCode: '인증번호 6자리를 입력해주세요.' }));
      return;
    }

    try {
      const result = await confirmPhoneCode.mutateAsync({ verificationId, code: form.managerPhoneCode.trim() });
      if (verificationId !== managerPhoneVerificationIdRef.current || target !== currentManagerPhoneRef.current.replace(/\D/g, '')) return;
      setVerification((current) => ({ ...current, phoneToken: result.verificationToken }));
      setFieldErrors((current) => ({ ...current, managerPhoneCode: '' }));
    } catch (error) {
      if (verificationId !== managerPhoneVerificationIdRef.current || target !== currentManagerPhoneRef.current.replace(/\D/g, '')) return;
      setFieldErrors((current) => ({ ...current, managerPhoneCode: getRecoveryErrorMessage(error, '휴대폰 인증 확인에 실패했습니다.') }));
    }
  };

  const handleSendEmailCode = async () => {
    if (!isValidEmail(form.managerEmail)) {
      setFieldErrors((current) => ({ ...current, managerEmail: '담당자 이메일을 올바르게 입력해주세요.' }));
      return;
    }

    const target = form.managerEmail.trim();
    const requestOrder = ++managerEmailVerificationRequestRef.current;
    try {
      const result = await sendEmailCode.mutateAsync({
        channel: VERIFICATION_CHANNEL.EMAIL,
        target,
        purpose: VERIFICATION_PURPOSE.REGISTER,
      });
      if (requestOrder !== managerEmailVerificationRequestRef.current || target !== currentManagerEmailRef.current.trim()) return;
      managerEmailVerificationIdRef.current = result.verificationId;
      setVerification((current) => ({
        ...current,
        emailId: result.verificationId,
        emailToken: '',
        emailExpiresAt: result.expiresAt,
        emailResendAvailableAt: result.resendAvailableAt,
        emailRemainingAttempts: result.remainingAttempts,
      }));
      setFieldErrors((current) => ({ ...current, managerEmail: '', managerEmailCode: '' }));
    } catch (error) {
      if (requestOrder !== managerEmailVerificationRequestRef.current || target !== currentManagerEmailRef.current.trim()) return;
      setFieldErrors((current) => ({ ...current, managerEmail: getRecoveryErrorMessage(error, '이메일 인증번호 발송에 실패했습니다.') }));
    }
  };

  const handleConfirmEmailCode = async () => {
    const verificationId = managerEmailVerificationIdRef.current;
    const target = currentManagerEmailRef.current.trim();

    if (!verificationId) {
      setFieldErrors((current) => ({ ...current, managerEmailCode: '이메일 인증번호를 먼저 요청해주세요.' }));
      return;
    }
    if (emailExpiresIn <= 0) {
      setFieldErrors((current) => ({ ...current, managerEmailCode: '인증번호가 만료되었습니다. 다시 전송해주세요.' }));
      return;
    }
    if (!isValidVerificationCode(form.managerEmailCode)) {
      setFieldErrors((current) => ({ ...current, managerEmailCode: '인증번호 6자리를 입력해주세요.' }));
      return;
    }

    try {
      const result = await confirmEmailCode.mutateAsync({ verificationId, code: form.managerEmailCode.trim() });
      if (verificationId !== managerEmailVerificationIdRef.current || target !== currentManagerEmailRef.current.trim()) return;
      setVerification((current) => ({ ...current, emailToken: result.verificationToken }));
      setFieldErrors((current) => ({ ...current, managerEmailCode: '' }));
    } catch (error) {
      if (verificationId !== managerEmailVerificationIdRef.current || target !== currentManagerEmailRef.current.trim()) return;
      setFieldErrors((current) => ({ ...current, managerEmailCode: getRecoveryErrorMessage(error, '이메일 인증 확인에 실패했습니다.') }));
    }
  };

  const FIELD_LABEL_MAP: Record<string, string> = {
    companyType: '기업형태',
    businessNumber: '사업자등록번호',
    companyName: '회사명',
    ceoName: '대표자명',
    roadAddress: '회사주소',
    loginId: '아이디',
    managerName: '담당자명',
    password: '비밀번호',
    passwordConfirm: '비밀번호 확인',
    managerPhone: '담당자 전화번호',
    managerPhoneCode: '휴대폰 인증',
    managerEmail: '담당자 이메일',
    managerEmailCode: '이메일 인증',
    employmentCertificate: '재직증명서 업로드',
    terms: '약관 동의',
  };

  const buildSubmitErrorMessage = (errors: Record<string, string>): string => {
    const labels = Object.keys(errors)
      .map((key) => FIELD_LABEL_MAP[key])
      .filter(Boolean);
    if (labels.length === 0) return '입력값과 인증 완료 여부를 확인해주세요.';
    const display = labels.slice(0, 4).join(', ');
    return `미완료 항목: ${display}${labels.length > 4 ? ' 외' : ''}`;
  };

  const handleSubmit = async () => {
    let nextSnapshot = companySnapshot;
    let errors = validateCompanyRegisterForm(nextSnapshot, loginIdState);
    setFieldErrors(errors);
    setFormMessage('');
    setSuccessMessage('');

    if (Object.keys(errors).length > 0) {
      setFormMessage(buildSubmitErrorMessage(errors));
      return;
    }

    if (!nextSnapshot.employmentCertificateFileId && employmentCertificate) {
      const uploadingFile = employmentCertificate;
      try {
        const uploadResult = await uploadEmploymentCertificate.mutateAsync(uploadingFile);
        if (currentEmploymentCertificateRef.current !== uploadingFile) {
          return;
        }
        nextSnapshot = {
          ...nextSnapshot,
          employmentCertificateFileId: uploadResult.fileId,
        };
        setVerification((current) => ({ ...current, employmentCertificateFileId: uploadResult.fileId }));
        errors = validateCompanyRegisterForm(nextSnapshot, loginIdState);
        setFieldErrors(errors);
      } catch (error) {
        setFormMessage(getRecoveryErrorMessage(error, '재직증명서 업로드에 실패했습니다. 파일을 확인한 뒤 다시 시도해주세요.'));
        return;
      }
    }

    errors = validateCompanyRegisterForm(nextSnapshot, loginIdState);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setFormMessage(buildSubmitErrorMessage(errors));
      return;
    }

    try {
      await registerCompany.mutateAsync(toCompanyRegisterRequest(nextSnapshot));
      setSuccessMessage('기업회원 가입 신청이 접수되었습니다.');
      setIsSubmitGuideOpen(true);
    } catch (error) {
      setFormMessage(getRecoveryErrorMessage(error, '기업회원 가입 신청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'));
    }
  };

  return {
    businessNumberCheckState,
    businessNumberCheckMessage,
    canSubmit,
    checkBusinessNumber,
    checkLoginId,
    companySnapshot,
    confirmEmailCode,
    confirmPhoneCode,
    emailExpiresIn,
    emailResendIn,
    employmentCertificate,
    employmentCertificateError,
    employmentCertificateInputRef,
    fieldErrors,
    form,
    formMessage,
    handleAddressSearch,
    handleBusinessNumberCheck,
    handleCertificateChange,
    handleConfirmEmailCode,
    handleConfirmPhoneCode,
    handleLoginIdCheck,
    handleSendEmailCode,
    handleSendPhoneCode,
    handleSubmit,
    isSubmitGuideOpen,
    loginIdState,
    passwordMismatch,
    phoneExpiresIn,
    phoneResendIn,
    registerCompany,
    sendEmailCode,
    sendPhoneCode,
    setIsSubmitGuideOpen,
    setTerms,
    successMessage,
    terms,
    update,
    uploadEmploymentCertificate,
    verification,
  };
}
