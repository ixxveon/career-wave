import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VERIFICATION_CHANNEL, VERIFICATION_PURPOSE } from '../../../types/user/member';
import {
  formatPhoneNumber,
  isValidEmail,
  isValidLoginId,
  isValidPhone,
  isValidVerificationCode,
  toUserRegisterRequest,
  validatePersonalRegisterForm,
  type RegisterFieldErrors,
} from '../../../utils/user/member/registerSchema';
import { getRecoveryErrorMessage, getRemainingSeconds } from '../../../utils/user/member/recoveryView';
import { LOGIN_ID_CHECK_STATE, type LoginIdCheckState } from '../../../utils/user/member/validation';
import {
  useConfirmVerificationCode,
  useLoginIdCheck,
  useRegisterUser,
  useSendVerificationCode,
  useVerificationNow,
} from './index';

const initialPersonalForm = {
  userId: '',
  email: '',
  emailCode: '',
  password: '',
  passwordConfirm: '',
  name: '',
  phone: '',
  phoneCode: '',
};

const initialPersonalTerms = {
  age: false,
  service: false,
  privacy: false,
  marketing: false,
};

type PersonalForm = typeof initialPersonalForm;
type PersonalFormKey = keyof PersonalForm;

export function usePersonalRegisterForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialPersonalForm);
  const [terms, setTerms] = useState(initialPersonalTerms);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (navTimerRef.current) clearTimeout(navTimerRef.current); }, []);
  const currentLoginIdRef = useRef(form.userId);
  const currentEmailRef = useRef(form.email);
  const currentPhoneRef = useRef(form.phone);
  const emailVerificationIdRef = useRef('');
  const phoneVerificationIdRef = useRef('');
  const emailVerificationRequestRef = useRef(0);
  const phoneVerificationRequestRef = useRef(0);
  const [loginIdState, setLoginIdState] = useState<LoginIdCheckState>(LOGIN_ID_CHECK_STATE.UNCHECKED);
  const [verification, setVerification] = useState({
    emailId: '',
    emailToken: '',
    emailExpiresAt: '',
    emailResendAvailableAt: '',
    emailRemainingAttempts: 0,
    phoneId: '',
    phoneToken: '',
    phoneExpiresAt: '',
    phoneResendAvailableAt: '',
    phoneRemainingAttempts: 0,
  });
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [formMessage, setFormMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const checkLoginId = useLoginIdCheck();
  const sendEmailCode = useSendVerificationCode();
  const confirmEmailCode = useConfirmVerificationCode();
  const sendPhoneCode = useSendVerificationCode();
  const confirmPhoneCode = useConfirmVerificationCode();
  const registerUser = useRegisterUser();
  const now = useVerificationNow();
  const passwordMismatch = form.passwordConfirm && form.password !== form.passwordConfirm;
  const emailExpiresIn = getRemainingSeconds(verification.emailExpiresAt, now);
  const emailResendIn = getRemainingSeconds(verification.emailResendAvailableAt, now);
  const phoneExpiresIn = getRemainingSeconds(verification.phoneExpiresAt, now);
  const phoneResendIn = getRemainingSeconds(verification.phoneResendAvailableAt, now);
  const personalSnapshot = {
    loginId: form.userId,
    password: form.password,
    passwordConfirm: form.passwordConfirm,
    name: form.name,
    email: form.email,
    emailCode: form.emailCode,
    phone: form.phone,
    phoneCode: form.phoneCode,
    emailVerificationToken: verification.emailToken,
    phoneVerificationToken: verification.phoneToken,
    terms: {
      age: terms.age,
      service: terms.service,
      privacy: terms.privacy,
      marketing: terms.marketing,
    },
  };
  const canSubmit =
    Object.keys(validatePersonalRegisterForm(personalSnapshot, loginIdState)).length === 0 &&
    !registerUser.isPending;

  const update = (key: PersonalFormKey, value: PersonalForm[PersonalFormKey]) => {
    const nextValue = key === 'phone' && typeof value === 'string' ? formatPhoneNumber(value) : value;

    setForm((current) => ({ ...current, [key]: nextValue }));
    setFieldErrors((current) => ({
      ...current,
      [key]: '',
      ...(key === 'userId' ? { loginId: '' } : {}),
    }));
    setFormMessage('');
    setSuccessMessage('');

    if (key === 'userId') setLoginIdState(LOGIN_ID_CHECK_STATE.UNCHECKED);
    if (key === 'userId') currentLoginIdRef.current = typeof value === 'string' ? value : currentLoginIdRef.current;
    if (key === 'email') {
      currentEmailRef.current = typeof value === 'string' ? value : currentEmailRef.current;
      emailVerificationIdRef.current = '';
      setVerification((current) => ({
        ...current,
        emailId: '',
        emailToken: '',
        emailExpiresAt: '',
        emailResendAvailableAt: '',
        emailRemainingAttempts: 0,
      }));
    }
    if (key === 'phone') {
      currentPhoneRef.current = typeof nextValue === 'string' ? nextValue : currentPhoneRef.current;
      phoneVerificationIdRef.current = '';
      setVerification((current) => ({
        ...current,
        phoneId: '',
        phoneToken: '',
        phoneExpiresAt: '',
        phoneResendAvailableAt: '',
        phoneRemainingAttempts: 0,
      }));
    }
  };

  const handleLoginIdCheck = async () => {
    if (!isValidLoginId(form.userId)) {
      setLoginIdState(LOGIN_ID_CHECK_STATE.ERROR);
      setFieldErrors((current) => ({ ...current, loginId: '아이디는 영문과 숫자 조합 6~20자로 입력해주세요.' }));
      return;
    }

    const requestedLoginId = form.userId.trim();
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
      setLoginIdState(LOGIN_ID_CHECK_STATE.ERROR);
      setFieldErrors((current) => ({ ...current, loginId: getRecoveryErrorMessage(error, '아이디 중복 확인에 실패했습니다.') }));
    }
  };

  const handleSendEmailCode = async () => {
    if (!isValidEmail(form.email)) {
      setFieldErrors((current) => ({ ...current, email: '올바른 이메일 주소를 입력해주세요.' }));
      return;
    }

    const target = form.email.trim();
    const requestOrder = ++emailVerificationRequestRef.current;
    try {
      const result = await sendEmailCode.mutateAsync({
        channel: VERIFICATION_CHANNEL.EMAIL,
        target,
        purpose: VERIFICATION_PURPOSE.REGISTER,
      });
      if (requestOrder !== emailVerificationRequestRef.current || target !== currentEmailRef.current.trim()) return;
      emailVerificationIdRef.current = result.verificationId;
      setVerification((current) => ({
        ...current,
        emailId: result.verificationId,
        emailToken: '',
        emailExpiresAt: result.expiresAt,
        emailResendAvailableAt: result.resendAvailableAt,
        emailRemainingAttempts: result.remainingAttempts,
      }));
      setFieldErrors((current) => ({ ...current, email: '', emailCode: '' }));
    } catch (error) {
      if (requestOrder !== emailVerificationRequestRef.current || target !== currentEmailRef.current.trim()) return;
      setFieldErrors((current) => ({ ...current, email: getRecoveryErrorMessage(error, '이메일 인증번호 발송에 실패했습니다.') }));
    }
  };

  const handleConfirmEmailCode = async () => {
    const verificationId = emailVerificationIdRef.current;
    const target = currentEmailRef.current.trim();

    if (!verificationId) {
      setFieldErrors((current) => ({ ...current, emailCode: '이메일 인증번호를 먼저 요청해주세요.' }));
      return;
    }
    if (emailExpiresIn <= 0) {
      setFieldErrors((current) => ({ ...current, emailCode: '인증번호가 만료되었습니다. 다시 전송해주세요.' }));
      return;
    }
    if (!isValidVerificationCode(form.emailCode)) {
      setFieldErrors((current) => ({ ...current, emailCode: '인증번호 6자리를 입력해주세요.' }));
      return;
    }

    try {
      const result = await confirmEmailCode.mutateAsync({ verificationId, code: form.emailCode.trim() });
      if (verificationId !== emailVerificationIdRef.current || target !== currentEmailRef.current.trim()) return;
      setVerification((current) => ({ ...current, emailToken: result.verificationToken }));
      setFieldErrors((current) => ({ ...current, emailCode: '' }));
    } catch (error) {
      if (verificationId !== emailVerificationIdRef.current || target !== currentEmailRef.current.trim()) return;
      setFieldErrors((current) => ({ ...current, emailCode: getRecoveryErrorMessage(error, '이메일 인증 확인에 실패했습니다.') }));
    }
  };

  const handleSendPhoneCode = async () => {
    if (!isValidPhone(form.phone)) {
      setFieldErrors((current) => ({ ...current, phone: '휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해주세요.' }));
      return;
    }

    const target = form.phone.replace(/\D/g, '');
    const requestOrder = ++phoneVerificationRequestRef.current;
    try {
      const result = await sendPhoneCode.mutateAsync({
        channel: VERIFICATION_CHANNEL.PHONE,
        target,
        purpose: VERIFICATION_PURPOSE.REGISTER,
      });
      if (requestOrder !== phoneVerificationRequestRef.current || target !== currentPhoneRef.current.replace(/\D/g, '')) return;
      phoneVerificationIdRef.current = result.verificationId;
      setVerification((current) => ({
        ...current,
        phoneId: result.verificationId,
        phoneToken: '',
        phoneExpiresAt: result.expiresAt,
        phoneResendAvailableAt: result.resendAvailableAt,
        phoneRemainingAttempts: result.remainingAttempts,
      }));
      setFieldErrors((current) => ({ ...current, phone: '', phoneCode: '' }));
    } catch (error) {
      if (requestOrder !== phoneVerificationRequestRef.current || target !== currentPhoneRef.current.replace(/\D/g, '')) return;
      setFieldErrors((current) => ({ ...current, phone: getRecoveryErrorMessage(error, '휴대폰 인증번호 발송에 실패했습니다.') }));
    }
  };

  const handleConfirmPhoneCode = async () => {
    const verificationId = phoneVerificationIdRef.current;
    const target = currentPhoneRef.current.replace(/\D/g, '');

    if (!verificationId) {
      setFieldErrors((current) => ({ ...current, phoneCode: '휴대폰 인증번호를 먼저 요청해주세요.' }));
      return;
    }
    if (phoneExpiresIn <= 0) {
      setFieldErrors((current) => ({ ...current, phoneCode: '인증번호가 만료되었습니다. 다시 전송해주세요.' }));
      return;
    }
    if (!isValidVerificationCode(form.phoneCode)) {
      setFieldErrors((current) => ({ ...current, phoneCode: '인증번호 6자리를 입력해주세요.' }));
      return;
    }

    try {
      const result = await confirmPhoneCode.mutateAsync({ verificationId, code: form.phoneCode.trim() });
      if (verificationId !== phoneVerificationIdRef.current || target !== currentPhoneRef.current.replace(/\D/g, '')) return;
      setVerification((current) => ({ ...current, phoneToken: result.verificationToken }));
      setFieldErrors((current) => ({ ...current, phoneCode: '' }));
    } catch (error) {
      if (verificationId !== phoneVerificationIdRef.current || target !== currentPhoneRef.current.replace(/\D/g, '')) return;
      setFieldErrors((current) => ({ ...current, phoneCode: getRecoveryErrorMessage(error, '휴대폰 인증 확인에 실패했습니다.') }));
    }
  };

  // 「변경」— 전송한 이메일/휴대폰을 다시 편집 가능하게 잠금 해제하고 인증 상태를 초기화한다. (issue #1036)
  const handleChangeEmail = () => {
    emailVerificationRequestRef.current += 1;
    emailVerificationIdRef.current = '';
    setVerification((current) => ({
      ...current,
      emailId: '',
      emailToken: '',
      emailExpiresAt: '',
      emailResendAvailableAt: '',
      emailRemainingAttempts: 0,
    }));
    setForm((current) => ({ ...current, emailCode: '' }));
    setFieldErrors((current) => ({ ...current, email: '', emailCode: '' }));
    setFormMessage('');
    setSuccessMessage('');
  };

  const handleChangePhone = () => {
    phoneVerificationRequestRef.current += 1;
    phoneVerificationIdRef.current = '';
    setVerification((current) => ({
      ...current,
      phoneId: '',
      phoneToken: '',
      phoneExpiresAt: '',
      phoneResendAvailableAt: '',
      phoneRemainingAttempts: 0,
    }));
    setForm((current) => ({ ...current, phoneCode: '' }));
    setFieldErrors((current) => ({ ...current, phone: '', phoneCode: '' }));
    setFormMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async () => {
    const errors = validatePersonalRegisterForm(personalSnapshot, loginIdState);
    setFieldErrors(errors);
    setFormMessage('');
    setSuccessMessage('');

    if (Object.keys(errors).length > 0) {
      setFormMessage('입력값과 인증 완료 여부를 확인해주세요.');
      return;
    }

    try {
      await registerUser.mutateAsync(toUserRegisterRequest(personalSnapshot));
      setSuccessMessage('회원가입이 완료되었습니다. 로그인 페이지로 이동합니다...');
      navTimerRef.current = setTimeout(() => navigate('/auth/login?registered=true', { replace: true }), 2000);
    } catch (error) {
      setFormMessage(getRecoveryErrorMessage(error, '회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'));
    }
  };

  return {
    canSubmit,
    checkLoginId,
    confirmEmailCode,
    confirmPhoneCode,
    emailExpiresIn,
    emailResendIn,
    fieldErrors,
    form,
    formMessage,
    handleChangeEmail,
    handleChangePhone,
    handleConfirmEmailCode,
    handleConfirmPhoneCode,
    handleLoginIdCheck,
    handleSendEmailCode,
    handleSendPhoneCode,
    handleSubmit,
    loginIdState,
    passwordMismatch,
    phoneExpiresIn,
    phoneResendIn,
    registerUser,
    sendEmailCode,
    sendPhoneCode,
    setTerms,
    successMessage,
    terms,
    update,
    verification,
  };
}
