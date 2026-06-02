import { useRef, useState } from 'react';
import { useConfirmVerificationCode } from './useVerificationCode';
import { useFindId } from './useAccountRecovery';
import { useSendVerificationCode } from './useVerificationCode';
import {
  EMPTY_VERIFICATION,
  type VerificationState,
  getRecoveryErrorMessage,
  getRemainingSeconds,
  useVerificationNow,
} from '../../components/member/recoveryViewUtils';
import { VERIFICATION_PURPOSE } from '../../types/member';
import {
  RECOVERY_METHOD,
  type CompanyFindIdForm,
  type RecoveryFieldErrors,
  type RecoveryMethod,
  type UserFindIdForm,
  getRecoveryTarget,
  getVerificationChannel,
  hasRecoveryFieldErrors,
  toFindIdRequest,
  validateCompanyFindIdSubmission,
  validateCompanyRecoveryTarget,
  validateUserFindIdSubmission,
  validateUserRecoveryTarget,
  validateVerificationConfirm,
} from '../../utils/member/recoverySchema';

interface RecoveryResultState {
  submitted: boolean;
  found: boolean;
  maskedLoginIds: string[];
}

const EMPTY_RESULT: RecoveryResultState = {
  submitted: false,
  found: false,
  maskedLoginIds: [],
};

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

export function useFindIdRecovery(isCompany: boolean) {
  const now = useVerificationNow();
  const sendVerification = useSendVerificationCode();
  const confirmVerification = useConfirmVerificationCode();
  const findIdMutation = useFindId();

  const [userMethod, setUserMethod] = useState<RecoveryMethod>(RECOVERY_METHOD.EMAIL);
  const [userForm, setUserForm] = useState<UserFindIdForm>({
    email: '',
    phone: '',
    code: '',
  });
  const [companyForm, setCompanyForm] = useState<CompanyFindIdForm>({
    managerName: '',
    businessNumber: '',
    email: '',
    code: '',
  });
  const [fieldErrors, setFieldErrors] = useState<RecoveryFieldErrors>({});
  const [formMessage, setFormMessage] = useState('');
  const [result, setResult] = useState<RecoveryResultState>(EMPTY_RESULT);
  const [userVerification, setUserVerificationState] = useState(createUserVerificationState);
  const [companyVerification, setCompanyVerificationState] = useState<VerificationState>({ ...EMPTY_VERIFICATION });

  const userVerificationRef = useRef(userVerification);
  const companyVerificationRef = useRef(companyVerification);
  const userEmailRequestRef = useRef(0);
  const userPhoneRequestRef = useRef(0);
  const companyEmailRequestRef = useRef(0);
  const currentUserEmailRef = useRef('');
  const currentUserPhoneRef = useRef('');
  const currentCompanyEmailRef = useRef('');

  const activeUserVerification = userVerification[userMethod];
  const userExpiresIn = getRemainingSeconds(activeUserVerification.expiresAt, now);
  const userResendIn = getRemainingSeconds(activeUserVerification.resendAvailableAt, now);
  const companyExpiresIn = getRemainingSeconds(companyVerification.expiresAt, now);
  const companyResendIn = getRemainingSeconds(companyVerification.resendAvailableAt, now);

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

  const clearResultState = () => {
    setResult(EMPTY_RESULT);
    setFormMessage('');
  };

  const updateUser = (key: keyof UserFindIdForm, value: string) => {
    setUserForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '', form: '' }));
    clearResultState();

    if (key === 'email') {
      currentUserEmailRef.current = value.trim();
      setUserVerification((current) => ({
        ...current,
        [RECOVERY_METHOD.EMAIL]: { ...EMPTY_VERIFICATION },
      }));
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
      if (userMethod === RECOVERY_METHOD.PHONE) {
        setUserForm((current) => ({ ...current, code: '' }));
      }
    }
  };

  const updateCompany = (key: keyof CompanyFindIdForm, value: string) => {
    setCompanyForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: '', form: '' }));
    clearResultState();

    if (key === 'email') {
      currentCompanyEmailRef.current = value.trim();
      setCompanyVerification(() => ({ ...EMPTY_VERIFICATION }));
      setCompanyForm((current) => ({ ...current, code: '' }));
    }
  };

  const resetUserMethod = (method: RecoveryMethod) => {
    setUserMethod(method);
    setFieldErrors({});
    setFormMessage('');
    setResult(EMPTY_RESULT);
    setUserForm((current) => ({ ...current, code: '' }));
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
        purpose: VERIFICATION_PURPOSE.FIND_ID,
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
      setFieldErrors((current) => ({
        ...current,
        email: '',
        phone: '',
        code: '',
        form: '',
      }));
      setUserForm((current) => ({ ...current, code: '' }));
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
        purpose: VERIFICATION_PURPOSE.FIND_ID,
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

  const handleFindId = async () => {
    try {
      if (isCompany) {
        const verificationToken = companyVerification.verificationToken;
        const errors = validateCompanyFindIdSubmission(companyForm, verificationToken);
        if (hasRecoveryFieldErrors(errors)) {
          setFieldErrors((current) => ({ ...current, ...errors }));
          return;
        }

        const requestSnapshot = [
          companyForm.managerName.trim(),
          companyForm.businessNumber.replace(/\D/g, ''),
          currentCompanyEmailRef.current.trim(),
          verificationToken,
        ].join('|');
        const response = await findIdMutation.mutateAsync(
          toFindIdRequest('company', verificationToken, companyForm),
        );
        const currentSnapshot = [
          companyForm.managerName.trim(),
          companyForm.businessNumber.replace(/\D/g, ''),
          currentCompanyEmailRef.current.trim(),
          companyVerificationRef.current.verificationToken,
        ].join('|');
        if (requestSnapshot !== currentSnapshot) return;

        setResult({
          submitted: true,
          found: response.found,
          maskedLoginIds: response.maskedLoginIds,
        });
      } else {
        const verificationToken = activeUserVerification.verificationToken;
        const errors = validateUserFindIdSubmission(userForm, userMethod, verificationToken);
        if (hasRecoveryFieldErrors(errors)) {
          setFieldErrors((current) => ({ ...current, ...errors }));
          return;
        }

        const requestSnapshot = [
          userMethod,
          getRecoveryTarget(userMethod, currentUserEmailRef.current, currentUserPhoneRef.current),
          verificationToken,
        ].join('|');
        const response = await findIdMutation.mutateAsync(
          toFindIdRequest('user', verificationToken),
        );
        const currentSnapshot = [
          userMethod,
          getRecoveryTarget(userMethod, currentUserEmailRef.current, currentUserPhoneRef.current),
          userVerificationRef.current[userMethod].verificationToken,
        ].join('|');
        if (requestSnapshot !== currentSnapshot) return;

        setResult({
          submitted: true,
          found: response.found,
          maskedLoginIds: response.maskedLoginIds,
        });
      }

      setFormMessage('');
      setFieldErrors({});
    } catch (error) {
      setFormMessage(getRecoveryErrorMessage(error, '아이디 찾기에 실패했습니다. 잠시 후 다시 시도해주세요.'));
    }
  };

  return {
    userMethod,
    userForm,
    companyForm,
    fieldErrors,
    formMessage,
    result,
    activeUserVerification,
    companyVerification,
    userExpiresIn,
    userResendIn,
    companyExpiresIn,
    companyResendIn,
    sendVerificationPending: sendVerification.isPending,
    confirmVerificationPending: confirmVerification.isPending,
    findIdPending: findIdMutation.isPending,
    updateUser,
    updateCompany,
    resetUserMethod,
    handleSendUserCode,
    handleConfirmUserCode,
    handleSendCompanyCode,
    handleConfirmCompanyCode,
    handleFindId,
  };
}
