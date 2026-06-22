import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authSession } from '../../../utils/user/member/authSession';
import { VERIFICATION_CHANNEL, VERIFICATION_PURPOSE, type SocialProviderId } from '../../../types/user/member';
import { useCompleteSocialRegister, useConfirmVerificationCode, useSendVerificationCode, useVerificationNow } from '../../../hooks/user/member';
import { getSocialProviderLabel } from '../../../utils/user/member/socialAuth';
import { formatRemaining, getRecoveryErrorMessage, getRemainingSeconds } from '../../../utils/user/member/recoveryView';
import { isValidPhone, isValidVerificationCode, normalizePhone } from '../../../utils/user/member/registerSchema';
import '@/styles/user/auth/AuthPage.css';

// Phase 5 OAuth callback 페이지에서 이 키로 저장: sessionStorage.setItem(SOCIAL_SIGNUP_TOKEN_SESSION_KEY, token)
export const SOCIAL_SIGNUP_TOKEN_SESSION_KEY = 'cw:oauth:social-signup-token';

const carriers = ['SKT', 'KT', 'LG U+', '알뜰폰'];

const initialForm = {
  name: '',
  carrier: '',
  phone: '',
  phoneCode: '',
};

const initialTerms = {
  service: false,
  privacy: false,
  marketing: false,
};

type RegisterVerifyForm = typeof initialForm;
type RegisterVerifyFormKey = keyof RegisterVerifyForm;
type RegisterVerifyTerms = typeof initialTerms;
type RegisterVerifyTermKey = keyof RegisterVerifyTerms;

function RegisterVerifyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const providerId = searchParams.get('provider') as SocialProviderId | null;
  const provider = getSocialProviderLabel(providerId);
  const socialEmail = searchParams.get('email')?.trim() || '';
  // socialSignupToken: URL query 대신 sessionStorage에서 읽음 (브라우저 히스토리/로그 노출 방지)
  // Phase 5 OAuth callback 페이지에서 sessionStorage.setItem(SESSION_KEY, token) 후 이 페이지로 redirect
  // removeItem은 렌더링 중 호출하지 않고 등록 성공 후 호출 — StrictMode/병렬 렌더 대응 및 실패 시 재시도 허용
  const [socialSignupToken] = useState<string>(
    () => sessionStorage.getItem(SOCIAL_SIGNUP_TOKEN_SESSION_KEY) ?? ''
  );
  const [form, setForm] = useState(initialForm);
  const [terms, setTerms] = useState(initialTerms);
  const [verification, setVerification] = useState({
    verificationId: '',
    verificationToken: '',
    expiresAt: '',
    resendAvailableAt: '',
    remainingAttempts: 0,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (navTimerRef.current) clearTimeout(navTimerRef.current); }, []);
  const currentPhoneRef = useRef('');
  const verificationRequestRef = useRef(0);
  const sendPhoneCode = useSendVerificationCode();
  const confirmPhoneCode = useConfirmVerificationCode();
  const completeSocialRegister = useCompleteSocialRegister();
  const now = useVerificationNow();
  const phoneExpiresIn = getRemainingSeconds(verification.expiresAt, now);
  const phoneResendIn = getRemainingSeconds(verification.resendAvailableAt, now);
  const normalizedPhone = normalizePhone(form.phone);
  const allTermsChecked = terms.service && terms.privacy && terms.marketing;

  const clearMessages = () => {
    setFormMessage('');
    setSuccessMessage('');
  };

  const update = (key: RegisterVerifyFormKey, value: RegisterVerifyForm[RegisterVerifyFormKey]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'phone' ? { phoneCode: '' } : {}),
    }));
    clearMessages();
    setFieldErrors((current) => ({
      ...current,
      [key]: '',
      ...(key === 'phone' ? { phoneCode: '' } : {}),
    }));

    if (key === 'phone') {
      currentPhoneRef.current = typeof value === 'string' ? normalizePhone(value) : currentPhoneRef.current;
      verificationRequestRef.current += 1;
      setVerification({
        verificationId: '',
        verificationToken: '',
        expiresAt: '',
        resendAvailableAt: '',
        remainingAttempts: 0,
      });
    }

    if (key === 'phoneCode') {
      setVerification((current) => ({
        ...current,
        verificationToken: '',
      }));
    }
  };

  const toggleAll = (checked: boolean) => {
    setTerms({
      service: checked,
      privacy: checked,
      marketing: checked,
    });
    clearMessages();
    setFieldErrors((current) => ({ ...current, terms: '' }));
  };

  const toggleTerm = (key: RegisterVerifyTermKey) => {
    setTerms((current) => ({
      ...current,
      [key]: !current[key],
    }));
    clearMessages();
    setFieldErrors((current) => ({ ...current, terms: '' }));
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};

    if (!providerId || !provider) {
      nextErrors.provider = '유효한 소셜 가입 경로가 아닙니다. 다시 시도해주세요.';
    }
    if (!socialSignupToken.trim()) {
      nextErrors.provider = '소셜 가입 세션이 만료되었습니다. 소셜 로그인을 다시 진행해주세요.';
    }
    if (!form.name.trim()) nextErrors.name = '이름을 입력해주세요.';
    if (!form.carrier.trim()) nextErrors.carrier = '통신사를 선택해주세요.';
    if (!isValidPhone(form.phone)) nextErrors.phone = '휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해주세요.';
    if (!verification.verificationId) {
      nextErrors.phoneCode = '휴대폰 인증번호를 먼저 요청해주세요.';
    } else if (!verification.verificationToken.trim()) {
      nextErrors.phoneCode = '휴대폰 인증을 완료해주세요.';
    }
    if (!terms.service || !terms.privacy) {
      nextErrors.terms = '필수 약관에 동의해주세요.';
    }

    return nextErrors;
  };

  const handleSendPhoneCode = async () => {
    if (!isValidPhone(form.phone)) {
      setFieldErrors((current) => ({ ...current, phone: '휴대폰 번호는 010으로 시작하는 11자리 숫자로 입력해주세요.' }));
      return;
    }

    const target = normalizePhone(form.phone);
    currentPhoneRef.current = target;
    const requestOrder = ++verificationRequestRef.current;
    clearMessages();

    try {
      const result = await sendPhoneCode.mutateAsync({
        channel: VERIFICATION_CHANNEL.PHONE,
        target,
        purpose: VERIFICATION_PURPOSE.REGISTER,
      });
      if (requestOrder !== verificationRequestRef.current || target !== currentPhoneRef.current) return;

      setVerification({
        verificationId: result.verificationId,
        verificationToken: '',
        expiresAt: result.expiresAt,
        resendAvailableAt: result.resendAvailableAt,
        remainingAttempts: result.remainingAttempts,
      });
      setFieldErrors((current) => ({ ...current, phone: '', phoneCode: '' }));
      setSuccessMessage('인증번호를 전송했습니다. 유효 시간 내에 인증을 완료해주세요.');
    } catch (error) {
      if (requestOrder !== verificationRequestRef.current || target !== currentPhoneRef.current) return;
      setFieldErrors((current) => ({ ...current, phone: getRecoveryErrorMessage(error, '휴대폰 인증번호 발송에 실패했습니다.') }));
    }
  };

  const handleConfirmPhoneCode = async () => {
    const verificationId = verification.verificationId;
    const target = currentPhoneRef.current;

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

    const requestOrder = verificationRequestRef.current;
    clearMessages();

    try {
      const result = await confirmPhoneCode.mutateAsync({
        verificationId,
        code: form.phoneCode.trim(),
      });
      if (requestOrder !== verificationRequestRef.current || target !== currentPhoneRef.current) return;

      setVerification((current) => ({
        ...current,
        verificationToken: result.verificationToken,
      }));
      setFieldErrors((current) => ({ ...current, phoneCode: '' }));
      setSuccessMessage('휴대폰 인증이 완료되었습니다.');
    } catch (error) {
      if (requestOrder !== verificationRequestRef.current || target !== currentPhoneRef.current) return;
      setFieldErrors((current) => ({ ...current, phoneCode: getRecoveryErrorMessage(error, '휴대폰 인증 확인에 실패했습니다.') }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateForm();
    setFieldErrors(nextErrors);
    clearMessages();

    if (Object.keys(nextErrors).length > 0) {
      setFormMessage('입력값과 휴대폰 인증 완료 여부를 확인해주세요.');
      return;
    }

    try {
      const result = await completeSocialRegister.mutateAsync({
        provider: providerId as SocialProviderId,
        socialSignupToken,
        socialEmail: socialEmail || undefined,
        name: form.name.trim(),
        carrier: form.carrier.trim(),
        phone: normalizedPhone,
        phoneVerificationToken: verification.verificationToken,
        terms: {
          service: terms.service,
          privacy: terms.privacy,
          marketing: terms.marketing,
        },
      });
      sessionStorage.removeItem(SOCIAL_SIGNUP_TOKEN_SESSION_KEY);
      if (result.accessToken) authSession.setTokens({ accessToken: result.accessToken });
      setSuccessMessage('소셜 가입이 완료되었습니다. 잠시 후 이동합니다.');
      navTimerRef.current = setTimeout(() => navigate(result.nextPath, { replace: true }), 1500);
    } catch (error) {
      setFormMessage(getRecoveryErrorMessage(error, '소셜 가입 완료 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'));
    }
  };

  return (
    <section className="cw-auth-page cw-register-page">
      <div className="cw-register-shell cw-register-shell--narrow">
        <div className="cw-register-hero">
          <p className="cw-auth-eyebrow">SOCIAL SIGN UP</p>
          <h1>추가 정보 입력</h1>
          <p>Career Wave 이용을 위해 소셜 계정에 필요한 정보를 조금만 더 입력해주세요.</p>
        </div>

        <form className="cw-register-form" onSubmit={handleSubmit}>
          <section className="cw-register-section">
            <div className="cw-register-section__title">
              <ShieldCheck size={22} />
              <div>
                <h2>소셜 계정 정보</h2>
                <p>소셜 인증으로 전달된 계정 정보를 확인하고 추가 정보를 입력해주세요.</p>
              </div>
            </div>
            <div className="cw-register-social-summary">
              <span>가입 방식</span>
              <strong>{provider ? `${provider} 소셜 계정` : '소셜 계정'}</strong>
              <span>이메일</span>
              <strong>{socialEmail || '소셜 계정 이메일 확인 대기'}</strong>
            </div>
            {fieldErrors.provider && <p className="cw-register-error">{fieldErrors.provider}</p>}
          </section>

          <section className="cw-register-section">
            <div className="cw-register-section__title">
              <UserRound size={22} />
              <div>
                <h2>기본 정보</h2>
                <p>본인 확인과 서비스 안내에 필요한 정보입니다.</p>
              </div>
            </div>
            <div className="cw-register-grid">
              <label className="cw-register-field">
                <span className="cw-register-label">
                  이름 <em>*</em>
                </span>
                <input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="이름" />
                {fieldErrors.name && <p className="cw-register-error">{fieldErrors.name}</p>}
              </label>
              <label className="cw-register-field">
                <span className="cw-register-label">
                  통신사 <em>*</em>
                </span>
                <select value={form.carrier} onChange={(event) => update('carrier', event.target.value)}>
                  <option value="">통신사 선택</option>
                  {carriers.map((carrier) => (
                    <option value={carrier} key={carrier}>
                      {carrier}
                    </option>
                  ))}
                </select>
                {fieldErrors.carrier && <p className="cw-register-error">{fieldErrors.carrier}</p>}
              </label>
              <label className="cw-register-field cw-register-field--wide">
                <span className="cw-register-label">
                  휴대폰 번호 <em>*</em>
                </span>
                <div className="cw-register-inline">
                  <input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="010-0000-0000" />
                  <button className="cw-register-sub-button" type="button" onClick={() => void handleSendPhoneCode()} disabled={sendPhoneCode.isPending || phoneResendIn > 0}>
                    {sendPhoneCode.isPending ? '전송 중' : verification.verificationId ? `재전송${phoneResendIn > 0 ? ` ${formatRemaining(phoneResendIn)}` : ''}` : '인증번호 전송'}
                  </button>
                </div>
                {verification.verificationId && !verification.verificationToken && phoneExpiresIn > 0 && (
                  <span className="cw-register-status">
                    <CheckCircle2 size={15} />
                    인증번호 유효 시간 {formatRemaining(phoneExpiresIn)}
                  </span>
                )}
                {verification.verificationId && !verification.verificationToken && phoneExpiresIn <= 0 && (
                  <p className="cw-register-error">휴대폰 인증번호가 만료되었습니다. 다시 전송해주세요.</p>
                )}
                {fieldErrors.phone && <p className="cw-register-error">{fieldErrors.phone}</p>}
              </label>
              <label className="cw-register-field cw-register-field--wide">
                <span className="cw-register-label">휴대폰 인증번호</span>
                <div className="cw-register-inline">
                  <input value={form.phoneCode} onChange={(event) => update('phoneCode', event.target.value)} placeholder="인증번호 입력" />
                  <button
                    className="cw-register-sub-button"
                    type="button"
                    onClick={() => void handleConfirmPhoneCode()}
                    disabled={confirmPhoneCode.isPending || !verification.verificationId || phoneExpiresIn <= 0}
                  >
                    {confirmPhoneCode.isPending ? '확인 중' : '인증 확인'}
                  </button>
                </div>
                {verification.verificationToken && (
                  <span className="cw-register-status">
                    <CheckCircle2 size={15} />
                    휴대폰 인증 완료
                  </span>
                )}
                {fieldErrors.phoneCode && <p className="cw-register-error">{fieldErrors.phoneCode}</p>}
              </label>
            </div>
          </section>

          <section className="cw-register-section">
            <div className="cw-register-section__title">
              <CheckCircle2 size={22} />
              <div>
                <h2>약관 동의</h2>
                <p>필수 약관 동의 후 소셜 가입을 완료할 수 있습니다.</p>
              </div>
            </div>
            <div className="cw-register-terms">
              <label className="cw-register-check cw-register-check--all">
                <input type="checkbox" checked={allTermsChecked} onChange={(event) => toggleAll(event.target.checked)} />
                <span>전체 동의</span>
              </label>
              <label className="cw-register-check">
                <input type="checkbox" checked={terms.service} onChange={() => toggleTerm('service')} />
                <span>
                  <strong>[필수]</strong> 이용약관 동의
                </span>
              </label>
              <label className="cw-register-check">
                <input type="checkbox" checked={terms.privacy} onChange={() => toggleTerm('privacy')} />
                <span>
                  <strong>[필수]</strong> 개인정보 수집 및 이용 동의
                </span>
              </label>
              <label className="cw-register-check">
                <input type="checkbox" checked={terms.marketing} onChange={() => toggleTerm('marketing')} />
                <span>
                  <strong>[선택]</strong> 마케팅 정보 수신 동의
                </span>
              </label>
            </div>
            {fieldErrors.terms && <p className="cw-register-error">{fieldErrors.terms}</p>}
          </section>

          {formMessage && <p className="cw-register-error">{formMessage}</p>}
          {successMessage && (
            <span className="cw-register-status">
              <CheckCircle2 size={15} />
              {successMessage}
            </span>
          )}

          <button className="cw-register-submit" disabled={completeSocialRegister.isPending} type="submit">
            {completeSocialRegister.isPending ? '가입 처리 중' : '가입 완료'}
          </button>
        </form>
      </div>
    </section>
  );
}

export default RegisterVerifyPage;
