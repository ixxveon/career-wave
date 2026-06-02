import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Mail, Phone, UserRound, Building2 } from 'lucide-react';
import { useConfirmVerificationCode, useFindId, useSendVerificationCode } from '../../hooks/member';
import { VERIFICATION_PURPOSE, type ConfirmVerificationResponse, type SendVerificationResponse } from '../../types/member';
import type { MemberApiError } from '../../utils/member/errorMapping';
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
import './AuthPage.css';

interface VerificationState {
  verificationId: string;
  verificationToken: string;
  expiresAt: string;
  resendAvailableAt: string;
  remainingAttempts: number;
}

interface RecoveryResultState {
  submitted: boolean;
  found: boolean;
  maskedLoginIds: string[];
}

const EMPTY_VERIFICATION: VerificationState = {
  verificationId: '',
  verificationToken: '',
  expiresAt: '',
  resendAvailableAt: '',
  remainingAttempts: 0,
};

const EMPTY_RESULT: RecoveryResultState = {
  submitted: false,
  found: false,
  maskedLoginIds: [],
};

function useVerificationNow() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  return now;
}

function getRemainingSeconds(target: string, now: number): number {
  if (!target) return 0;
  return Math.max(0, Math.ceil((new Date(target).getTime() - now) / 1000));
}

function formatRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const nextSeconds = seconds % 60;
  return `${minutes}:${String(nextSeconds).padStart(2, '0')}`;
}

function getErrorMessage(error: unknown, fallback: string, field?: string): string {
  if (error && typeof error === 'object' && 'fieldErrors' in error && field) {
    const fieldErrors = (error as MemberApiError).fieldErrors;
    if (fieldErrors?.[field]) return fieldErrors[field];
  }

  return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
    ? error.message
    : fallback;
}

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
        [errorField]: getErrorMessage(error, '인증번호 발송에 실패했습니다.', errorField),
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
        code: getErrorMessage(error, '인증 확인에 실패했습니다.', 'code'),
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
        email: getErrorMessage(error, '이메일 인증번호 발송에 실패했습니다.', 'email'),
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
        code: getErrorMessage(error, '이메일 인증 확인에 실패했습니다.', 'code'),
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
      setFormMessage(getErrorMessage(error, '아이디 찾기에 실패했습니다. 잠시 후 다시 시도해주세요.'));
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
                      type="tel"
                      inputMode="numeric"
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
            <div className="cw-auth-result" aria-live="polite">
              {result.found && result.maskedLoginIds.length > 0 ? (
                <>
                  <p>가입된 아이디를 확인했습니다.</p>
                  <ul>
                    {result.maskedLoginIds.map((loginId) => (
                      <li key={loginId}>{loginId}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>입력하신 정보와 일치하는 계정을 바로 확인할 수 없습니다. 가입 정보를 다시 확인하거나 고객센터로 문의해주세요.</p>
              )}
            </div>
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
