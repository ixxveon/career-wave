import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, Mail, Phone, UserRound, Building2 } from 'lucide-react';
import { useConfirmVerificationCode, useFindId, useSendVerificationCode } from '../../hooks/member';
import { VERIFICATION_PURPOSE, type ConfirmVerificationResponse, type SendVerificationResponse } from '../../types/member';
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
import RecoverySupportPanel from './RecoverySupportPanel';
import { RecoveryCodeField, RecoveryContactField } from './RecoveryVerificationFields';
import RecoveryResultPanel from './RecoveryResultPanel';
import {
  EMPTY_VERIFICATION,
  type VerificationState,
  getRecoveryErrorMessage,
  getRemainingSeconds,
  useVerificationNow,
} from './recoveryViewUtils';
import './AuthPage.css';

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

function FindIdPage() {
  const { memberType } = useParams();
  const isCompany = memberType === 'company';
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
  const [userVerification, setUserVerification] = useState<Record<RecoveryMethod, VerificationState>>({
    [RECOVERY_METHOD.EMAIL]: { ...EMPTY_VERIFICATION },
    [RECOVERY_METHOD.PHONE]: { ...EMPTY_VERIFICATION },
  });
  const [companyVerification, setCompanyVerification] = useState<VerificationState>({ ...EMPTY_VERIFICATION });

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
      setCompanyVerification({ ...EMPTY_VERIFICATION });
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
        purpose: VERIFICATION_PURPOSE.FIND_ID,
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
        purpose: VERIFICATION_PURPOSE.FIND_ID,
      });

      if (requestOrder !== companyEmailRequestRef.current || target !== currentCompanyEmailRef.current.trim()) return;
      applySendResult(setCompanyVerification, response);
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

    try {
      const response = await confirmVerification.mutateAsync({
        verificationId,
        code: companyForm.code.trim(),
      });

      if (verificationId !== companyVerification.verificationId || target !== currentCompanyEmailRef.current.trim()) return;
      applyConfirmResult(setCompanyVerification, response);
      setFieldErrors((current) => ({ ...current, code: '', form: '' }));
    } catch (error) {
      if (verificationId !== companyVerification.verificationId || target !== currentCompanyEmailRef.current.trim()) return;
      setFieldErrors((current) => ({
        ...current,
        code: getRecoveryErrorMessage(error, '이메일 인증 확인에 실패했습니다.', 'code'),
      }));
    }
  };

  const handleFindId = async () => {
    try {
      if (isCompany) {
        const errors = validateCompanyFindIdSubmission(companyForm, companyVerification.verificationToken);
        if (hasRecoveryFieldErrors(errors)) {
          setFieldErrors((current) => ({ ...current, ...errors }));
          return;
        }

        const response = await findIdMutation.mutateAsync(
          toFindIdRequest('company', companyVerification.verificationToken, companyForm),
        );
        setResult({
          submitted: true,
          found: response.found,
          maskedLoginIds: response.maskedLoginIds,
        });
      } else {
        const errors = validateUserFindIdSubmission(userForm, userMethod, activeUserVerification.verificationToken);
        if (hasRecoveryFieldErrors(errors)) {
          setFieldErrors((current) => ({ ...current, ...errors }));
          return;
        }

        const response = await findIdMutation.mutateAsync(
          toFindIdRequest('user', activeUserVerification.verificationToken),
        );
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

  return (
    <section className="cw-auth-page cw-auth-page--recovery">
      <div className="cw-auth-recovery cw-auth-recovery--detail">
        <div className="cw-auth-recovery__hero">
          <p className="cw-auth-eyebrow">FIND ID</p>
          <h1>{isCompany ? '기업회원 아이디 찾기' : '개인회원 아이디 찾기'}</h1>
          <p>
            {isCompany
              ? '담당자 정보와 사업자등록번호, 이메일 인증으로 아이디를 찾을 수 있습니다.'
              : '가입 시 등록한 이메일 또는 휴대폰 번호로 아이디를 찾을 수 있습니다.'}
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
            {!isCompany && userMethod === RECOVERY_METHOD.EMAIL && (
              <RecoveryContactField
                label="이메일"
                icon={<Mail size={18} />}
                value={userForm.email}
                placeholder="이메일 주소 입력"
                error={fieldErrors.email}
                verification={activeUserVerification}
                feedbackText="이메일 인증번호가 발송되었습니다."
                sendPending={sendVerification.isPending}
                resendIn={userResendIn}
                buttonClassName="cw-auth-sub-button cw-auth-sub-button--send"
                inputType="email"
                onChange={(value) => updateUser('email', value)}
                onSend={handleSendUserCode}
              />
            )}

            {!isCompany && userMethod === RECOVERY_METHOD.PHONE && (
              <RecoveryContactField
                label="휴대폰 번호"
                icon={<Phone size={18} />}
                value={userForm.phone}
                placeholder="휴대폰번호('-' 없이 숫자만 입력)"
                error={fieldErrors.phone}
                verification={activeUserVerification}
                feedbackText="휴대폰 인증번호가 발송되었습니다."
                sendPending={sendVerification.isPending}
                resendIn={userResendIn}
                inputType="tel"
                inputMode="numeric"
                onChange={(value) => updateUser('phone', value)}
                onSend={handleSendUserCode}
              />
            )}

            {!isCompany && (
              <RecoveryCodeField
                label="인증번호 입력"
                code={userForm.code}
                error={fieldErrors.code}
                verification={activeUserVerification}
                expiresIn={userExpiresIn}
                resendIn={userResendIn}
                confirmPending={confirmVerification.isPending}
                sendPending={sendVerification.isPending}
                onCodeChange={(value) => updateUser('code', value)}
                onConfirm={handleConfirmUserCode}
                onResend={handleSendUserCode}
              />
            )}

            {isCompany && (
              <>
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
                <RecoveryContactField
                  label="담당자 이메일"
                  icon={<Mail size={18} />}
                  value={companyForm.email}
                  placeholder="담당자 이메일 주소 입력"
                  error={fieldErrors.email}
                  verification={companyVerification}
                  feedbackText="이메일 인증번호가 발송되었습니다."
                  sendPending={sendVerification.isPending}
                  resendIn={companyResendIn}
                  buttonClassName="cw-auth-sub-button cw-auth-sub-button--send"
                  inputType="email"
                  onChange={(value) => updateCompany('email', value)}
                  onSend={handleSendCompanyCode}
                />
                <RecoveryCodeField
                  label="이메일 인증번호 입력"
                  code={companyForm.code}
                  error={fieldErrors.code}
                  verification={companyVerification}
                  expiresIn={companyExpiresIn}
                  resendIn={companyResendIn}
                  confirmPending={confirmVerification.isPending}
                  sendPending={sendVerification.isPending}
                  onCodeChange={(value) => updateCompany('code', value)}
                  onConfirm={handleConfirmCompanyCode}
                  onResend={handleSendCompanyCode}
                />
              </>
            )}

            {formMessage && (
              <p className="cw-auth-message cw-auth-message--error" role="alert">
                <AlertCircle size={16} />
                {formMessage}
              </p>
            )}

            <button
              className="cw-auth-main-button"
              disabled={findIdMutation.isPending}
              type="button"
              onClick={handleFindId}
            >
              {findIdMutation.isPending ? '확인 중' : '아이디 찾기'}
            </button>
          </form>

          {result.submitted && (
            <RecoveryResultPanel
              found={result.found}
              maskedLoginIds={result.maskedLoginIds}
            />
          )}

          <div className="cw-auth-links">
            <Link to="/auth/find-account">선택 페이지로 돌아가기</Link>
            <span aria-hidden="true">|</span>
            <Link to={`/auth/find-password/${isCompany ? 'company' : 'user'}`}>비밀번호 찾기</Link>
          </div>
        </div>

        <RecoverySupportPanel />
      </div>
    </section>
  );
}

export default FindIdPage;
