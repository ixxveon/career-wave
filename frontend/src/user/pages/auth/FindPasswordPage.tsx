import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, LockKeyhole, Mail, Phone, UserRound, Building2 } from 'lucide-react';
import {
  useConfirmVerificationCode,
  useIssuePasswordToken,
  useResetPassword,
  useSendVerificationCode,
} from '../../hooks/member';
import { VERIFICATION_PURPOSE, type ConfirmVerificationResponse, type SendVerificationResponse } from '../../types/member';
import {
  RECOVERY_METHOD,
  type CompanyFindPasswordForm,
  type RecoveryFieldErrors,
  type RecoveryMethod,
  type UserFindPasswordForm,
  getRecoveryTarget,
  getVerificationChannel,
  hasRecoveryFieldErrors,
  toPasswordTokenRequest,
  toResetPasswordRequest,
  validateCompanyPasswordTokenRequest,
  validateCompanyRecoveryTarget,
  validateResetPassword,
  validateUserPasswordTokenRequest,
  validateUserRecoveryTarget,
  validateVerificationConfirm,
} from '../../utils/member/recoverySchema';
import RecoverySupportPanel from './RecoverySupportPanel';
import {
  EMPTY_RESET_SESSION,
  EMPTY_VERIFICATION,
  type ResetSessionState,
  type VerificationState,
  formatRemaining,
  getRecoveryErrorMessage,
  getRemainingSeconds,
  useVerificationNow,
} from './recoveryViewUtils';
import './AuthPage.css';

function FindPasswordPage() {
  const { memberType } = useParams();
  const isCompany = memberType === 'company';
  const now = useVerificationNow();
  const sendVerification = useSendVerificationCode();
  const confirmVerification = useConfirmVerificationCode();
  const issuePasswordToken = useIssuePasswordToken();
  const resetPassword = useResetPassword();

  const [userMethod, setUserMethod] = useState<RecoveryMethod>(RECOVERY_METHOD.EMAIL);
  const [userForm, setUserForm] = useState<UserFindPasswordForm>({
    loginId: '',
    email: '',
    phone: '',
    code: '',
    nextPassword: '',
    nextPasswordConfirm: '',
  });
  const [companyForm, setCompanyForm] = useState<CompanyFindPasswordForm>({
    loginId: '',
    managerName: '',
    businessNumber: '',
    email: '',
    code: '',
    nextPassword: '',
    nextPasswordConfirm: '',
  });
  const [fieldErrors, setFieldErrors] = useState<RecoveryFieldErrors>({});
  const [formMessage, setFormMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [userVerification, setUserVerification] = useState<Record<RecoveryMethod, VerificationState>>({
    [RECOVERY_METHOD.EMAIL]: { ...EMPTY_VERIFICATION },
    [RECOVERY_METHOD.PHONE]: { ...EMPTY_VERIFICATION },
  });
  const [companyVerification, setCompanyVerification] = useState<VerificationState>({ ...EMPTY_VERIFICATION });
  const [userResetSession, setUserResetSession] = useState<ResetSessionState>({ ...EMPTY_RESET_SESSION });
  const [companyResetSession, setCompanyResetSession] = useState<ResetSessionState>({ ...EMPTY_RESET_SESSION });

  const userEmailRequestRef = useRef(0);
  const userPhoneRequestRef = useRef(0);
  const companyEmailRequestRef = useRef(0);
  const currentUserEmailRef = useRef('');
  const currentUserPhoneRef = useRef('');
  const currentUserLoginIdRef = useRef('');
  const currentCompanyEmailRef = useRef('');
  const currentCompanyLoginIdRef = useRef('');
  const currentCompanyManagerNameRef = useRef('');
  const currentCompanyBusinessNumberRef = useRef('');

  const activeUserVerification = userVerification[userMethod];
  const userExpiresIn = getRemainingSeconds(activeUserVerification.expiresAt, now);
  const userResendIn = getRemainingSeconds(activeUserVerification.resendAvailableAt, now);
  const companyExpiresIn = getRemainingSeconds(companyVerification.expiresAt, now);
  const companyResendIn = getRemainingSeconds(companyVerification.resendAvailableAt, now);
  const userResetExpiresIn = getRemainingSeconds(userResetSession.expiresAt, now);
  const companyResetExpiresIn = getRemainingSeconds(companyResetSession.expiresAt, now);
  const activeResetSession = isCompany ? companyResetSession : userResetSession;
  const activeResetExpiresIn = isCompany ? companyResetExpiresIn : userResetExpiresIn;

  const clearMessages = () => {
    setFormMessage('');
    setSuccessMessage('');
  };

  const clearUserResetSession = () => {
    setUserResetSession({ ...EMPTY_RESET_SESSION });
  };

  const clearCompanyResetSession = () => {
    setCompanyResetSession({ ...EMPTY_RESET_SESSION });
  };

  const updateUser = (key: keyof UserFindPasswordForm, value: string) => {
    setUserForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '', form: '' }));
    clearMessages();

    if (key === 'loginId') {
      currentUserLoginIdRef.current = value.trim();
      clearUserResetSession();
    }

    if (key === 'email') {
      currentUserEmailRef.current = value.trim();
      setUserVerification((current) => ({
        ...current,
        [RECOVERY_METHOD.EMAIL]: { ...EMPTY_VERIFICATION },
      }));
      clearUserResetSession();
      if (userMethod === RECOVERY_METHOD.EMAIL) {
        setUserForm((current) => ({ ...current, code: '' }));
      }
    }

    if (key === 'phone') {
      currentUserPhoneRef.current = value.replace(/\D/g, '');
      setUserVerification((current) => ({
        ...current,
        [RECOVERY_METHOD.PHONE]: { ...EMPTY_VERIFICATION },
      }));
      clearUserResetSession();
      if (userMethod === RECOVERY_METHOD.PHONE) {
        setUserForm((current) => ({ ...current, code: '' }));
      }
    }
  };

  const updateCompany = (key: keyof CompanyFindPasswordForm, value: string) => {
    setCompanyForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '', form: '' }));
    clearMessages();

    if (key === 'loginId') {
      currentCompanyLoginIdRef.current = value.trim();
      clearCompanyResetSession();
    }
    if (key === 'managerName') {
      currentCompanyManagerNameRef.current = value.trim();
      clearCompanyResetSession();
    }
    if (key === 'businessNumber') {
      currentCompanyBusinessNumberRef.current = value.replace(/\D/g, '');
      clearCompanyResetSession();
    }
    if (key === 'email') {
      currentCompanyEmailRef.current = value.trim();
      setCompanyVerification({ ...EMPTY_VERIFICATION });
      clearCompanyResetSession();
      setCompanyForm((current) => ({ ...current, code: '' }));
    }
  };

  const resetUserMethod = (method: RecoveryMethod) => {
    setUserMethod(method);
    setFieldErrors({});
    clearMessages();
    clearUserResetSession();
    setUserForm((current) => ({
      ...current,
      code: '',
      nextPassword: '',
      nextPasswordConfirm: '',
    }));
  };

  const applySendResult = (
    setVerification: (updater: (current: VerificationState) => VerificationState) => void,
    resultData: SendVerificationResponse,
  ) => {
    setVerification(() => ({
      verificationId: resultData.verificationId,
      verificationToken: '',
      expiresAt: resultData.expiresAt,
      resendAvailableAt: resultData.resendAvailableAt,
      remainingAttempts: resultData.remainingAttempts,
    }));
  };

  const applyConfirmResult = (
    setVerification: (updater: (current: VerificationState) => VerificationState) => void,
    resultData: ConfirmVerificationResponse,
  ) => {
    setVerification((current) => ({
      ...current,
      verificationToken: resultData.verificationToken,
    }));
  };

  const handleSendUserCode = async () => {
    const errors = validateUserRecoveryTarget(userForm, userMethod);
    if (hasRecoveryFieldErrors(errors)) {
      setFieldErrors((current) => ({ ...current, ...errors }));
      return;
    }

    const target = getRecoveryTarget(userMethod, userForm.email, userForm.phone);
    const requestOrder = userMethod === RECOVERY_METHOD.EMAIL
      ? ++userEmailRequestRef.current
      : ++userPhoneRequestRef.current;

    try {
      const response = await sendVerification.mutateAsync({
        channel: getVerificationChannel(userMethod),
        target,
        purpose: VERIFICATION_PURPOSE.RESET_PASSWORD,
      });

      const currentTarget = getRecoveryTarget(userMethod, currentUserEmailRef.current, currentUserPhoneRef.current);
      const latestOrder = userMethod === RECOVERY_METHOD.EMAIL ? userEmailRequestRef.current : userPhoneRequestRef.current;
      if (requestOrder !== latestOrder || target !== currentTarget) return;

      setUserVerification((current) => {
        const nextState = { ...current };
        nextState[userMethod] = {
          verificationId: response.verificationId,
          verificationToken: '',
          expiresAt: response.expiresAt,
          resendAvailableAt: response.resendAvailableAt,
          remainingAttempts: response.remainingAttempts,
        };
        return nextState;
      });
      setFieldErrors((current) => ({ ...current, email: '', phone: '', code: '', form: '' }));
      setUserForm((current) => ({ ...current, code: '' }));
      clearUserResetSession();
    } catch (error) {
      const currentTarget = getRecoveryTarget(userMethod, currentUserEmailRef.current, currentUserPhoneRef.current);
      const latestOrder = userMethod === RECOVERY_METHOD.EMAIL ? userEmailRequestRef.current : userPhoneRequestRef.current;
      if (requestOrder !== latestOrder || target !== currentTarget) return;

      const errorField = userMethod === RECOVERY_METHOD.EMAIL ? 'email' : 'phone';
      setFieldErrors((current) => ({
        ...current,
        [errorField]: getRecoveryErrorMessage(error, '인증번호 발송에 실패했습니다.', errorField),
      }));
    }
  };

  const handleConfirmUserCode = async () => {
    if (userExpiresIn <= 0 && activeUserVerification.expiresAt) {
      setFieldErrors((current) => ({ ...current, code: '인증번호가 만료되었습니다. 다시 전송해주세요.' }));
      return;
    }

    const errors = validateVerificationConfirm(userForm.code, activeUserVerification.verificationId);
    if (hasRecoveryFieldErrors(errors)) {
      setFieldErrors((current) => ({ ...current, ...errors }));
      return;
    }

    const verificationId = activeUserVerification.verificationId;
    const target = getRecoveryTarget(userMethod, currentUserEmailRef.current, currentUserPhoneRef.current);

    try {
      const response = await confirmVerification.mutateAsync({
        verificationId,
        code: userForm.code.trim(),
      });

      const currentVerification = userVerification[userMethod];
      const currentTarget = getRecoveryTarget(userMethod, currentUserEmailRef.current, currentUserPhoneRef.current);
      if (verificationId !== currentVerification.verificationId || target !== currentTarget) return;

      setUserVerification((current) => {
        const nextState = { ...current };
        nextState[userMethod] = {
          ...current[userMethod],
          verificationToken: response.verificationToken,
        };
        return nextState;
      });
      setFieldErrors((current) => ({ ...current, code: '', form: '' }));
      clearUserResetSession();
    } catch (error) {
      const currentVerification = userVerification[userMethod];
      const currentTarget = getRecoveryTarget(userMethod, currentUserEmailRef.current, currentUserPhoneRef.current);
      if (verificationId !== currentVerification.verificationId || target !== currentTarget) return;

      setFieldErrors((current) => ({
        ...current,
        code: getRecoveryErrorMessage(error, '인증 확인에 실패했습니다.', 'code'),
      }));
    }
  };

  const handleSendCompanyCode = async () => {
    const errors = validateCompanyRecoveryTarget(companyForm);
    if (hasRecoveryFieldErrors(errors)) {
      setFieldErrors((current) => ({ ...current, ...errors }));
      return;
    }

    const target = companyForm.email.trim();
    const requestOrder = ++companyEmailRequestRef.current;

    try {
      const response = await sendVerification.mutateAsync({
        channel: getVerificationChannel(RECOVERY_METHOD.EMAIL),
        target,
        purpose: VERIFICATION_PURPOSE.RESET_PASSWORD,
      });

      if (requestOrder !== companyEmailRequestRef.current || target !== currentCompanyEmailRef.current.trim()) return;
      applySendResult(setCompanyVerification, response);
      setFieldErrors((current) => ({ ...current, email: '', code: '', form: '' }));
      setCompanyForm((current) => ({ ...current, code: '' }));
      clearCompanyResetSession();
    } catch (error) {
      if (requestOrder !== companyEmailRequestRef.current || target !== currentCompanyEmailRef.current.trim()) return;
      setFieldErrors((current) => ({
        ...current,
        email: getRecoveryErrorMessage(error, '이메일 인증번호 발송에 실패했습니다.', 'email'),
      }));
    }
  };

  const handleConfirmCompanyCode = async () => {
    if (companyExpiresIn <= 0 && companyVerification.expiresAt) {
      setFieldErrors((current) => ({ ...current, code: '인증번호가 만료되었습니다. 다시 전송해주세요.' }));
      return;
    }

    const errors = validateVerificationConfirm(companyForm.code, companyVerification.verificationId);
    if (hasRecoveryFieldErrors(errors)) {
      setFieldErrors((current) => ({ ...current, ...errors }));
      return;
    }

    const verificationId = companyVerification.verificationId;
    const target = currentCompanyEmailRef.current.trim();

    try {
      const response = await confirmVerification.mutateAsync({
        verificationId,
        code: companyForm.code.trim(),
      });

      if (verificationId !== companyVerification.verificationId || target !== currentCompanyEmailRef.current.trim()) return;
      applyConfirmResult(setCompanyVerification, response);
      setFieldErrors((current) => ({ ...current, code: '', form: '' }));
      clearCompanyResetSession();
    } catch (error) {
      if (verificationId !== companyVerification.verificationId || target !== currentCompanyEmailRef.current.trim()) return;
      setFieldErrors((current) => ({
        ...current,
        code: getRecoveryErrorMessage(error, '이메일 인증 확인에 실패했습니다.', 'code'),
      }));
    }
  };

  const handleIssueResetToken = async () => {
    try {
      if (isCompany) {
        const errors = validateCompanyPasswordTokenRequest(companyForm, companyVerification.verificationToken);
        if (hasRecoveryFieldErrors(errors)) {
          setFieldErrors((current) => ({ ...current, ...errors }));
          return;
        }

        const identitySnapshot = [
          currentCompanyLoginIdRef.current.trim(),
          currentCompanyManagerNameRef.current.trim(),
          currentCompanyBusinessNumberRef.current,
          currentCompanyEmailRef.current.trim(),
        ].join('|');

        const response = await issuePasswordToken.mutateAsync(
          toPasswordTokenRequest('company', companyForm, companyVerification.verificationToken, companyForm),
        );

        const currentSnapshot = [
          currentCompanyLoginIdRef.current.trim(),
          currentCompanyManagerNameRef.current.trim(),
          currentCompanyBusinessNumberRef.current,
          currentCompanyEmailRef.current.trim(),
        ].join('|');
        if (identitySnapshot !== currentSnapshot) return;

        setCompanyResetSession({
          resetToken: response.resetToken,
          expiresAt: response.expiresAt,
        });
      } else {
        const errors = validateUserPasswordTokenRequest(userForm, userMethod, activeUserVerification.verificationToken);
        if (hasRecoveryFieldErrors(errors)) {
          setFieldErrors((current) => ({ ...current, ...errors }));
          return;
        }

        const requestSnapshot = [
          currentUserLoginIdRef.current.trim(),
          getRecoveryTarget(userMethod, currentUserEmailRef.current, currentUserPhoneRef.current),
          userMethod,
        ].join('|');

        const response = await issuePasswordToken.mutateAsync(
          toPasswordTokenRequest('user', userForm, activeUserVerification.verificationToken),
        );

        const currentSnapshot = [
          currentUserLoginIdRef.current.trim(),
          getRecoveryTarget(userMethod, currentUserEmailRef.current, currentUserPhoneRef.current),
          userMethod,
        ].join('|');
        if (requestSnapshot !== currentSnapshot) return;

        setUserResetSession({
          resetToken: response.resetToken,
          expiresAt: response.expiresAt,
        });
      }

      setFieldErrors((current) => ({
        ...current,
        nextPassword: '',
        nextPasswordConfirm: '',
        form: '',
      }));
      setFormMessage('');
      setSuccessMessage('새 비밀번호를 입력한 뒤 저장해주세요.');
    } catch (error) {
      setFormMessage(getRecoveryErrorMessage(error, '비밀번호 재설정 권한 확인에 실패했습니다. 잠시 후 다시 시도해주세요.'));
    }
  };

  const handleResetPassword = async () => {
    const loginId = isCompany ? companyForm.loginId : userForm.loginId;
    const nextPassword = isCompany ? companyForm.nextPassword : userForm.nextPassword;
    const nextPasswordConfirm = isCompany ? companyForm.nextPasswordConfirm : userForm.nextPasswordConfirm;

    if (activeResetExpiresIn <= 0 && activeResetSession.expiresAt) {
      setFormMessage('재설정 가능 시간이 만료되었습니다. 인증을 다시 진행해주세요.');
      if (isCompany) {
        clearCompanyResetSession();
      } else {
        clearUserResetSession();
      }
      return;
    }

    const errors = validateResetPassword(
      loginId,
      nextPassword,
      nextPasswordConfirm,
      activeResetSession.resetToken,
    );
    if (hasRecoveryFieldErrors(errors)) {
      setFieldErrors((current) => ({ ...current, ...errors }));
      return;
    }

    try {
      await resetPassword.mutateAsync(
        toResetPasswordRequest(activeResetSession.resetToken, nextPassword),
      );
      setFormMessage('');
      setFieldErrors({});
      setSuccessMessage('비밀번호가 재설정되었습니다. 로그인해주세요.');
      if (isCompany) {
        clearCompanyResetSession();
      } else {
        clearUserResetSession();
      }
    } catch (error) {
      setFormMessage(getRecoveryErrorMessage(error, '비밀번호 재설정에 실패했습니다. 잠시 후 다시 시도해주세요.'));
    }
  };

  const hasResetToken = Boolean(activeResetSession.resetToken);

  return (
    <section className="cw-auth-page cw-auth-page--recovery">
      <div className="cw-auth-recovery cw-auth-recovery--detail">
        <div className="cw-auth-recovery__hero">
          <p className="cw-auth-eyebrow">FIND PASSWORD</p>
          <h1>{isCompany ? '기업회원 비밀번호 찾기' : '개인회원 비밀번호 찾기'}</h1>
          <p>
            {isCompany
              ? '아이디와 담당자 정보, 사업자등록번호, 담당자 이메일 인증 후 비밀번호를 재설정할 수 있습니다.'
              : '아이디와 본인 인증 후 비밀번호를 재설정할 수 있습니다.'}
          </p>
        </div>

        <div className="cw-auth-card cw-auth-card--detail">
          {!isCompany && (
            <div className="cw-register-tabs cw-register-tabs--auth" role="tablist" aria-label="개인회원 인증 방식">
              <button
                className={userMethod === RECOVERY_METHOD.EMAIL ? 'is-active' : ''}
                type="button"
                role="tab"
                aria-selected={userMethod === RECOVERY_METHOD.EMAIL}
                onClick={() => resetUserMethod(RECOVERY_METHOD.EMAIL)}
              >
                이메일로 인증
              </button>
              <button
                className={userMethod === RECOVERY_METHOD.PHONE ? 'is-active' : ''}
                type="button"
                role="tab"
                aria-selected={userMethod === RECOVERY_METHOD.PHONE}
                onClick={() => resetUserMethod(RECOVERY_METHOD.PHONE)}
              >
                휴대폰 번호로 인증
              </button>
            </div>
          )}

          <form className="cw-auth-form" noValidate>
            {!isCompany && (
              <label>
                아이디
                <span>
                  <UserRound size={18} />
                  <input
                    aria-invalid={Boolean(fieldErrors.loginId)}
                    type="text"
                    placeholder="아이디를 입력하세요"
                    value={userForm.loginId}
                    onChange={(event) => updateUser('loginId', event.target.value)}
                  />
                </span>
                {fieldErrors.loginId && <p className="cw-register-error">{fieldErrors.loginId}</p>}
              </label>
            )}

            {!isCompany && userMethod === RECOVERY_METHOD.EMAIL && (
              <label>
                이메일
                <div className="cw-auth-inline">
                  <span>
                    <Mail size={18} />
                    <input
                      aria-invalid={Boolean(fieldErrors.email)}
                      type="email"
                      placeholder="이메일 주소 입력"
                      value={userForm.email}
                      onChange={(event) => updateUser('email', event.target.value)}
                    />
                  </span>
                  <button
                    className="cw-auth-sub-button cw-auth-sub-button--send"
                    disabled={sendVerification.isPending || userResendIn > 0}
                    type="button"
                    onClick={handleSendUserCode}
                  >
                    {sendVerification.isPending ? '전송 중' : userResendIn > 0 ? `${formatRemaining(userResendIn)}` : '인증번호 전송'}
                  </button>
                </div>
                {fieldErrors.email && <p className="cw-register-error">{fieldErrors.email}</p>}
                {activeUserVerification.verificationId && !fieldErrors.email && (
                  <span className="cw-auth-feedback">
                    <CheckCircle2 size={15} />
                    이메일 인증번호가 발송되었습니다.
                    {activeUserVerification.remainingAttempts > 0 && ` 남은 시도 ${activeUserVerification.remainingAttempts}회`}
                  </span>
                )}
              </label>
            )}

            {!isCompany && userMethod === RECOVERY_METHOD.PHONE && (
              <label>
                휴대폰 번호
                <div className="cw-auth-inline">
                  <span>
                    <Phone size={18} />
                    <input
                      aria-invalid={Boolean(fieldErrors.phone)}
                      inputMode="numeric"
                      type="tel"
                      placeholder="휴대폰번호('-' 없이 숫자만 입력)"
                      value={userForm.phone}
                      onChange={(event) => updateUser('phone', event.target.value)}
                    />
                  </span>
                  <button
                    className="cw-auth-sub-button"
                    disabled={sendVerification.isPending || userResendIn > 0}
                    type="button"
                    onClick={handleSendUserCode}
                  >
                    {sendVerification.isPending ? '전송 중' : userResendIn > 0 ? `${formatRemaining(userResendIn)}` : '인증번호 전송'}
                  </button>
                </div>
                {fieldErrors.phone && <p className="cw-register-error">{fieldErrors.phone}</p>}
                {activeUserVerification.verificationId && !fieldErrors.phone && (
                  <span className="cw-auth-feedback">
                    <CheckCircle2 size={15} />
                    휴대폰 인증번호가 발송되었습니다.
                    {activeUserVerification.remainingAttempts > 0 && ` 남은 시도 ${activeUserVerification.remainingAttempts}회`}
                  </span>
                )}
              </label>
            )}

            {!isCompany && (
              <>
                <label>
                  인증번호 입력
                  <div className="cw-auth-inline cw-auth-inline--triple">
                    <span>
                      <CheckCircle2 size={18} />
                      <input
                        aria-invalid={Boolean(fieldErrors.code)}
                        inputMode="numeric"
                        type="text"
                        placeholder="인증번호 6자리 입력"
                        value={userForm.code}
                        onChange={(event) => updateUser('code', event.target.value)}
                      />
                    </span>
                    <button
                      className="cw-auth-button-secondary cw-auth-button-secondary--confirm"
                      disabled={confirmVerification.isPending}
                      type="button"
                      onClick={handleConfirmUserCode}
                    >
                      {confirmVerification.isPending ? '확인 중' : '인증 확인'}
                    </button>
                    <button
                      className="cw-auth-button-secondary cw-auth-button-secondary--resend"
                      disabled={sendVerification.isPending || userResendIn > 0}
                      type="button"
                      onClick={handleSendUserCode}
                    >
                      재전송
                    </button>
                  </div>
                  {fieldErrors.code && <p className="cw-register-error">{fieldErrors.code}</p>}
                  {activeUserVerification.verificationToken && !fieldErrors.code && (
                    <span className="cw-auth-feedback">
                      <CheckCircle2 size={15} />
                      인증이 완료되었습니다.
                    </span>
                  )}
                  {!activeUserVerification.verificationToken && activeUserVerification.expiresAt && userExpiresIn > 0 && (
                    <span className="cw-auth-feedback">
                      <CheckCircle2 size={15} />
                      인증번호 유효시간 {formatRemaining(userExpiresIn)}
                    </span>
                  )}
                </label>
              </>
            )}

            {isCompany && (
              <>
                <label>
                  아이디
                  <span>
                    <UserRound size={18} />
                    <input
                      aria-invalid={Boolean(fieldErrors.loginId)}
                      type="text"
                      placeholder="아이디를 입력하세요"
                      value={companyForm.loginId}
                      onChange={(event) => updateCompany('loginId', event.target.value)}
                    />
                  </span>
                  {fieldErrors.loginId && <p className="cw-register-error">{fieldErrors.loginId}</p>}
                </label>
                <label>
                  담당자명
                  <span>
                    <UserRound size={18} />
                    <input
                      aria-invalid={Boolean(fieldErrors.managerName)}
                      type="text"
                      placeholder="담당자명(실명)"
                      value={companyForm.managerName}
                      onChange={(event) => updateCompany('managerName', event.target.value)}
                    />
                  </span>
                  {fieldErrors.managerName && <p className="cw-register-error">{fieldErrors.managerName}</p>}
                </label>
                <label>
                  사업자등록번호
                  <span>
                    <Building2 size={18} />
                    <input
                      aria-invalid={Boolean(fieldErrors.businessNumber)}
                      inputMode="numeric"
                      type="text"
                      placeholder="사업자등록번호('-' 없이 숫자만 입력)"
                      value={companyForm.businessNumber}
                      onChange={(event) => updateCompany('businessNumber', event.target.value)}
                    />
                  </span>
                  {fieldErrors.businessNumber && <p className="cw-register-error">{fieldErrors.businessNumber}</p>}
                </label>
                <label>
                  담당자 이메일
                  <div className="cw-auth-inline">
                    <span>
                      <Mail size={18} />
                      <input
                        aria-invalid={Boolean(fieldErrors.email)}
                        type="email"
                        placeholder="담당자 이메일 주소 입력"
                        value={companyForm.email}
                        onChange={(event) => updateCompany('email', event.target.value)}
                      />
                    </span>
                    <button
                      className="cw-auth-sub-button cw-auth-sub-button--send"
                      disabled={sendVerification.isPending || companyResendIn > 0}
                      type="button"
                      onClick={handleSendCompanyCode}
                    >
                      {sendVerification.isPending ? '전송 중' : companyResendIn > 0 ? `${formatRemaining(companyResendIn)}` : '인증번호 전송'}
                    </button>
                  </div>
                  {fieldErrors.email && <p className="cw-register-error">{fieldErrors.email}</p>}
                  {companyVerification.verificationId && !fieldErrors.email && (
                    <span className="cw-auth-feedback">
                      <CheckCircle2 size={15} />
                      이메일 인증번호가 발송되었습니다.
                      {companyVerification.remainingAttempts > 0 && ` 남은 시도 ${companyVerification.remainingAttempts}회`}
                    </span>
                  )}
                </label>
                <label>
                  이메일 인증번호 입력
                  <div className="cw-auth-inline cw-auth-inline--triple">
                    <span>
                      <CheckCircle2 size={18} />
                      <input
                        aria-invalid={Boolean(fieldErrors.code)}
                        inputMode="numeric"
                        type="text"
                        placeholder="인증번호 6자리 입력"
                        value={companyForm.code}
                        onChange={(event) => updateCompany('code', event.target.value)}
                      />
                    </span>
                    <button
                      className="cw-auth-button-secondary cw-auth-button-secondary--confirm"
                      disabled={confirmVerification.isPending}
                      type="button"
                      onClick={handleConfirmCompanyCode}
                    >
                      {confirmVerification.isPending ? '확인 중' : '인증 확인'}
                    </button>
                    <button
                      className="cw-auth-button-secondary cw-auth-button-secondary--resend"
                      disabled={sendVerification.isPending || companyResendIn > 0}
                      type="button"
                      onClick={handleSendCompanyCode}
                    >
                      재전송
                    </button>
                  </div>
                  {fieldErrors.code && <p className="cw-register-error">{fieldErrors.code}</p>}
                  {companyVerification.verificationToken && !fieldErrors.code && (
                    <span className="cw-auth-feedback">
                      <CheckCircle2 size={15} />
                      인증이 완료되었습니다.
                    </span>
                  )}
                  {!companyVerification.verificationToken && companyVerification.expiresAt && companyExpiresIn > 0 && (
                    <span className="cw-auth-feedback">
                      <CheckCircle2 size={15} />
                      인증번호 유효시간 {formatRemaining(companyExpiresIn)}
                    </span>
                  )}
                </label>
              </>
            )}

            {hasResetToken && (
              <>
                <label>
                  새 비밀번호
                  <span>
                    <LockKeyhole size={18} />
                    <input
                      aria-invalid={Boolean(fieldErrors.nextPassword)}
                      type="password"
                      placeholder="비밀번호(8~64자의 영문, 숫자, 특수문자 포함)"
                      value={isCompany ? companyForm.nextPassword : userForm.nextPassword}
                      onChange={(event) =>
                        isCompany
                          ? updateCompany('nextPassword', event.target.value)
                          : updateUser('nextPassword', event.target.value)
                      }
                    />
                  </span>
                  {fieldErrors.nextPassword && <p className="cw-register-error">{fieldErrors.nextPassword}</p>}
                </label>
                <label>
                  새 비밀번호 확인
                  <span>
                    <LockKeyhole size={18} />
                    <input
                      aria-invalid={Boolean(fieldErrors.nextPasswordConfirm)}
                      type="password"
                      placeholder="비밀번호 재입력"
                      value={isCompany ? companyForm.nextPasswordConfirm : userForm.nextPasswordConfirm}
                      onChange={(event) =>
                        isCompany
                          ? updateCompany('nextPasswordConfirm', event.target.value)
                          : updateUser('nextPasswordConfirm', event.target.value)
                      }
                    />
                  </span>
                  {fieldErrors.nextPasswordConfirm && <p className="cw-register-error">{fieldErrors.nextPasswordConfirm}</p>}
                  {activeResetSession.expiresAt && activeResetExpiresIn > 0 && (
                    <span className="cw-auth-feedback">
                      <CheckCircle2 size={15} />
                      재설정 가능 시간 {formatRemaining(activeResetExpiresIn)}
                    </span>
                  )}
                </label>
              </>
            )}

            {formMessage && (
              <p className="cw-auth-message cw-auth-message--error" role="alert">
                <AlertCircle size={16} />
                {formMessage}
              </p>
            )}
            {successMessage && (
              <p className="cw-auth-feedback" role="status" aria-live="polite">
                <CheckCircle2 size={15} />
                {successMessage}
              </p>
            )}

            <button
              className="cw-auth-main-button"
              disabled={issuePasswordToken.isPending || resetPassword.isPending}
              type="button"
              onClick={hasResetToken ? handleResetPassword : handleIssueResetToken}
            >
              {hasResetToken
                ? resetPassword.isPending
                  ? '저장 중'
                  : '새 비밀번호 저장'
                : issuePasswordToken.isPending
                  ? '확인 중'
                  : '비밀번호 재설정 진행'}
            </button>
          </form>

          <div className="cw-auth-links">
            <Link to="/auth/find-account">선택 페이지로 돌아가기</Link>
            <span aria-hidden="true">|</span>
            <Link to={`/auth/find-id/${isCompany ? 'company' : 'user'}`}>아이디 찾기</Link>
            <span aria-hidden="true">|</span>
            <Link to="/auth/login">로그인</Link>
          </div>
        </div>

        <RecoverySupportPanel />
      </div>
    </section>
  );
}

export default FindPasswordPage;
