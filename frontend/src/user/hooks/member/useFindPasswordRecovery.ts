import { useRef, useState } from 'react';
import { useIssuePasswordToken, useResetPassword } from './useAccountRecovery';
import {
  useConfirmVerificationCode,
  useSendVerificationCode,
} from './useVerificationCode';
import { useVerificationNow } from './useVerificationNow';
import {
  EMPTY_RESET_SESSION,
  EMPTY_VERIFICATION,
  type ResetSessionState,
  type VerificationState,
  getRecoveryErrorMessage,
  getRemainingSeconds,
} from '../../utils/member/recoveryView';
import { VERIFICATION_PURPOSE } from '../../types/member';
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

function createUserVerificationState(): Record<RecoveryMethod, VerificationState> {
  return {
    [RECOVERY_METHOD.EMAIL]: { ...EMPTY_VERIFICATION },
    [RECOVERY_METHOD.PHONE]: { ...EMPTY_VERIFICATION },
  };
}

function toVerificationSnapshot(verification: VerificationState): string {
  return [
    verification.verificationId,
    verification.verificationToken,
    verification.expiresAt,
    verification.resendAvailableAt,
  ].join('|');
}

export function useFindPasswordRecovery(isCompany: boolean) {
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
  const [userVerification, setUserVerificationState] = useState(createUserVerificationState);
  const [companyVerification, setCompanyVerificationState] = useState<VerificationState>({ ...EMPTY_VERIFICATION });
  const [userResetSession, setUserResetSessionState] = useState<ResetSessionState>({ ...EMPTY_RESET_SESSION });
  const [companyResetSession, setCompanyResetSessionState] = useState<ResetSessionState>({ ...EMPTY_RESET_SESSION });

  const userVerificationRef = useRef(userVerification);
  const companyVerificationRef = useRef(companyVerification);
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
  const hasResetToken = Boolean(activeResetSession.resetToken);

  const setUserVerification = (updater: (current: Record<RecoveryMethod, VerificationState>) => Record<RecoveryMethod, VerificationState>) => {
    setUserVerificationState((current) => {
      const next = updater(current);
      userVerificationRef.current = next;
      return next;
    });
  };

  const setCompanyVerification = (updater: (current: VerificationState) => VerificationState) => {
    setCompanyVerificationState((current) => {
      const next = updater(current);
      companyVerificationRef.current = next;
      return next;
    });
  };

  const setUserResetSession = (next: ResetSessionState) => {
    setUserResetSessionState(next);
  };

  const setCompanyResetSession = (next: ResetSessionState) => {
    setCompanyResetSessionState(next);
  };

  const clearMessages = () => {
    setFormMessage('');
    setSuccessMessage('');
  };

  const clearUserResetSession = () => {
    setUserResetSession({ ...EMPTY_RESET_SESSION });
    setUserForm((current) => ({
      ...current,
      nextPassword: '',
      nextPasswordConfirm: '',
    }));
  };

  const clearCompanyResetSession = () => {
    setCompanyResetSession({ ...EMPTY_RESET_SESSION });
    setCompanyForm((current) => ({
      ...current,
      nextPassword: '',
      nextPasswordConfirm: '',
    }));
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
      setCompanyVerification(() => ({ ...EMPTY_VERIFICATION }));
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

      setUserVerification((current) => ({
        ...current,
        [userMethod]: {
          verificationId: response.verificationId,
          verificationToken: '',
          expiresAt: response.expiresAt,
          resendAvailableAt: response.resendAvailableAt,
          remainingAttempts: response.remainingAttempts,
        },
      }));
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
    const verificationSnapshot = toVerificationSnapshot(activeUserVerification);

    try {
      const response = await confirmVerification.mutateAsync({
        verificationId,
        code: userForm.code.trim(),
      });

      const currentVerification = userVerificationRef.current[userMethod];
      const currentTarget = getRecoveryTarget(userMethod, currentUserEmailRef.current, currentUserPhoneRef.current);
      if (
        verificationSnapshot !== toVerificationSnapshot(currentVerification)
        || verificationId !== currentVerification.verificationId
        || target !== currentTarget
      ) return;

      setUserVerification((current) => ({
        ...current,
        [userMethod]: {
          ...current[userMethod],
          verificationToken: response.verificationToken,
        },
      }));
      setFieldErrors((current) => ({ ...current, code: '', form: '' }));
      clearUserResetSession();
    } catch (error) {
      const currentVerification = userVerificationRef.current[userMethod];
      const currentTarget = getRecoveryTarget(userMethod, currentUserEmailRef.current, currentUserPhoneRef.current);
      if (
        verificationSnapshot !== toVerificationSnapshot(currentVerification)
        || verificationId !== currentVerification.verificationId
        || target !== currentTarget
      ) return;

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
      setCompanyVerification(() => ({
        verificationId: response.verificationId,
        verificationToken: '',
        expiresAt: response.expiresAt,
        resendAvailableAt: response.resendAvailableAt,
        remainingAttempts: response.remainingAttempts,
      }));
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
    const verificationSnapshot = toVerificationSnapshot(companyVerification);

    try {
      const response = await confirmVerification.mutateAsync({
        verificationId,
        code: companyForm.code.trim(),
      });

      const currentVerification = companyVerificationRef.current;
      if (
        verificationSnapshot !== toVerificationSnapshot(currentVerification)
        || verificationId !== currentVerification.verificationId
        || target !== currentCompanyEmailRef.current.trim()
      ) return;

      setCompanyVerification((current) => ({
        ...current,
        verificationToken: response.verificationToken,
      }));
      setFieldErrors((current) => ({ ...current, code: '', form: '' }));
      clearCompanyResetSession();
    } catch (error) {
      const currentVerification = companyVerificationRef.current;
      if (
        verificationSnapshot !== toVerificationSnapshot(currentVerification)
        || verificationId !== currentVerification.verificationId
        || target !== currentCompanyEmailRef.current.trim()
      ) return;

      setFieldErrors((current) => ({
        ...current,
        code: getRecoveryErrorMessage(error, '이메일 인증 확인에 실패했습니다.', 'code'),
      }));
    }
  };

  const handleIssueResetToken = async () => {
    try {
      if (isCompany) {
        const verificationToken = companyVerification.verificationToken;
        const errors = validateCompanyPasswordTokenRequest(companyForm, verificationToken);
        if (hasRecoveryFieldErrors(errors)) {
          setFieldErrors((current) => ({ ...current, ...errors }));
          return;
        }

        const identitySnapshot = [
          currentCompanyLoginIdRef.current.trim(),
          currentCompanyManagerNameRef.current.trim(),
          currentCompanyBusinessNumberRef.current,
          currentCompanyEmailRef.current.trim(),
          verificationToken,
        ].join('|');

        const response = await issuePasswordToken.mutateAsync(
          toPasswordTokenRequest('company', companyForm, verificationToken, companyForm),
        );

        const currentSnapshot = [
          currentCompanyLoginIdRef.current.trim(),
          currentCompanyManagerNameRef.current.trim(),
          currentCompanyBusinessNumberRef.current,
          currentCompanyEmailRef.current.trim(),
          companyVerificationRef.current.verificationToken,
        ].join('|');
        if (identitySnapshot !== currentSnapshot) return;

        setCompanyResetSession({
          resetToken: response.resetToken,
          expiresAt: response.expiresAt,
        });
      } else {
        const verificationToken = activeUserVerification.verificationToken;
        const errors = validateUserPasswordTokenRequest(userForm, userMethod, verificationToken);
        if (hasRecoveryFieldErrors(errors)) {
          setFieldErrors((current) => ({ ...current, ...errors }));
          return;
        }

        const requestSnapshot = [
          currentUserLoginIdRef.current.trim(),
          getRecoveryTarget(userMethod, currentUserEmailRef.current, currentUserPhoneRef.current),
          userMethod,
          verificationToken,
        ].join('|');

        const response = await issuePasswordToken.mutateAsync(
          toPasswordTokenRequest('user', userForm, verificationToken),
        );

        const currentSnapshot = [
          currentUserLoginIdRef.current.trim(),
          getRecoveryTarget(userMethod, currentUserEmailRef.current, currentUserPhoneRef.current),
          userMethod,
          userVerificationRef.current[userMethod].verificationToken,
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

  return {
    userMethod,
    userForm,
    companyForm,
    fieldErrors,
    formMessage,
    successMessage,
    activeUserVerification,
    companyVerification,
    activeResetSession,
    userExpiresIn,
    userResendIn,
    companyExpiresIn,
    companyResendIn,
    activeResetExpiresIn,
    hasResetToken,
    sendVerificationPending: sendVerification.isPending,
    confirmVerificationPending: confirmVerification.isPending,
    issuePasswordTokenPending: issuePasswordToken.isPending,
    resetPasswordPending: resetPassword.isPending,
    updateUser,
    updateCompany,
    resetUserMethod,
    handleSendUserCode,
    handleConfirmUserCode,
    handleSendCompanyCode,
    handleConfirmCompanyCode,
    handleIssueResetToken,
    handleResetPassword,
  };
}
