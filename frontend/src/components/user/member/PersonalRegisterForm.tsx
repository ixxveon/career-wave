import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { BadgeCheck, UserRound } from 'lucide-react';
import { AuthButtonGroup, Field, PasswordInput, StatusPill, TextInput } from './RegisterFormPrimitives';
import { LOGIN_ID_CHECK_STATE } from '../../../utils/user/member/validation';
import { usePersonalRegisterForm } from '../../../hooks/user/member/usePersonalRegisterForm';
import type { PersonalTermDetails, TermSection } from '../../../utils/user/member/registerTerms';
import { SOCIAL_PROVIDERS } from '../../../utils/user/member/socialAuth';
import { formatRemaining } from '../../../utils/user/member/recoveryView';
import { memberSocialAuthApi } from '../../../api/user/member/socialAuthApi';

type PersonalTermsValues = {
  age: boolean;
  service: boolean;
  privacy: boolean;
  marketing: boolean;
};

type PersonalTermKey = keyof PersonalTermsValues;

type PersonalTermsProps = {
  values: PersonalTermsValues;
  onChange: Dispatch<SetStateAction<PersonalTermsValues>>;
  termDetails: PersonalTermDetails;
};

export function PersonalRegisterForm({ termDetails }: { termDetails: PersonalTermDetails }) {
  const {
    checkLoginId,
    confirmEmailCode,
    confirmPhoneCode,
    emailExpiresIn,
    emailResendIn,
    fieldErrors,
    form,
    formMessage,
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
  } = usePersonalRegisterForm();

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleSubmit();
  };

  return (
    <form className="cw-register-form" onSubmit={handleFormSubmit}>
      <section className="cw-register-section cw-register-section--social">
        <div>
          <h2>소셜 계정으로 간편 가입</h2>
          <p>자주 쓰는 계정으로 시작하고 필요한 정보만 추가로 입력하세요.</p>
        </div>
        <div className="cw-social-login" aria-label="소셜 회원가입">
          {SOCIAL_PROVIDERS.map((provider) => (
            <button
              aria-label={`${provider.label} 회원가입`}
              className={`cw-social-login__button cw-social-login__${provider.id}`}
              key={provider.id}
              type="button"
              onClick={() => {
                void memberSocialAuthApi
                  .authorize(provider.id)
                  .then(({ authorizationUrl }) => { window.location.href = authorizationUrl; });
              }}
            >
              {provider.mark}
            </button>
          ))}
        </div>
      </section>

      <section className="cw-register-section">
        <div className="cw-register-section__title">
          <UserRound size={22} />
          <div>
            <h2>기본 정보</h2>
            <p>Career Wave 개인회원 서비스를 이용하기 위한 필수 정보입니다.</p>
          </div>
        </div>
        <div className="cw-register-grid">
          <Field label="아이디" required wide>
            <AuthButtonGroup
              input={<TextInput value={form.userId} onChange={(value) => update('userId', value)} placeholder="아이디(영문, 숫자 조합 6~20자)" />}
              buttonLabel={checkLoginId.isPending || loginIdState === LOGIN_ID_CHECK_STATE.CHECKING ? '확인 중' : '중복 확인'}
              disabled={checkLoginId.isPending || loginIdState === LOGIN_ID_CHECK_STATE.CHECKING}
              onClick={handleLoginIdCheck}
            />
            <StatusPill active={loginIdState === LOGIN_ID_CHECK_STATE.AVAILABLE}>사용 가능한 아이디입니다.</StatusPill>
            {fieldErrors.loginId && <p className="cw-register-error">{fieldErrors.loginId}</p>}
          </Field>
          <Field label="이름" required wide>
            <TextInput value={form.name} onChange={(value) => update('name', value)} placeholder="이름(실명)" />
          </Field>
          <Field label="이메일" required wide>
            <AuthButtonGroup
              input={<TextInput type="email" value={form.email} onChange={(value) => update('email', value)} placeholder="이메일 주소 입력" />}
              buttonLabel={sendEmailCode.isPending ? '전송 중' : verification.emailId ? `재전송${emailResendIn > 0 ? ` ${formatRemaining(emailResendIn)}` : ''}` : '인증번호 전송'}
              disabled={sendEmailCode.isPending || emailResendIn > 0}
              onClick={handleSendEmailCode}
            />
            <StatusPill active={Boolean(verification.emailId) && !verification.emailToken && emailExpiresIn > 0}>
              인증번호 유효 시간 {formatRemaining(emailExpiresIn)}
            </StatusPill>
            <StatusPill active={Boolean(verification.emailToken)}>이메일 인증이 완료되었습니다.</StatusPill>
            {verification.emailId && !verification.emailToken && emailExpiresIn <= 0 && (
              <p className="cw-register-error">이메일 인증번호가 만료되었습니다. 다시 전송해주세요.</p>
            )}
            {fieldErrors.email && <p className="cw-register-error">{fieldErrors.email}</p>}
          </Field>
          <Field label="이메일 인증번호" required wide>
            <AuthButtonGroup
              input={<TextInput value={form.emailCode} onChange={(value) => update('emailCode', value)} placeholder="인증번호 6자리 입력" />}
              buttonLabel={confirmEmailCode.isPending ? '확인 중' : '인증 확인'}
              disabled={confirmEmailCode.isPending || !verification.emailId || emailExpiresIn <= 0}
              onClick={handleConfirmEmailCode}
              secondButtonLabel="재전송"
              secondDisabled={sendEmailCode.isPending || emailResendIn > 0}
              onSecondClick={handleSendEmailCode}
            />
            {fieldErrors.emailCode && <p className="cw-register-error">{fieldErrors.emailCode}</p>}
          </Field>
          <Field label="휴대폰 번호" required wide>
            <AuthButtonGroup
              input={<TextInput type="tel" value={form.phone} onChange={(value) => update('phone', value)} placeholder="휴대폰번호('-' 없이 숫자만 입력)" />}
              buttonLabel={sendPhoneCode.isPending ? '전송 중' : verification.phoneId ? `재전송${phoneResendIn > 0 ? ` ${formatRemaining(phoneResendIn)}` : ''}` : '인증번호 전송'}
              disabled={sendPhoneCode.isPending || phoneResendIn > 0}
              onClick={handleSendPhoneCode}
            />
            <StatusPill active={Boolean(verification.phoneId) && !verification.phoneToken && phoneExpiresIn > 0}>
              인증번호 유효 시간 {formatRemaining(phoneExpiresIn)}
            </StatusPill>
            {verification.phoneId && !verification.phoneToken && phoneExpiresIn <= 0 && (
              <p className="cw-register-error">휴대폰 인증번호가 만료되었습니다. 다시 전송해주세요.</p>
            )}
            {fieldErrors.phone && <p className="cw-register-error">{fieldErrors.phone}</p>}
          </Field>
          <Field label="휴대폰 인증번호" required wide>
            <AuthButtonGroup
              input={<TextInput value={form.phoneCode} onChange={(value) => update('phoneCode', value)} placeholder="인증번호 6자리 입력" />}
              buttonLabel={confirmPhoneCode.isPending ? '확인 중' : '인증 확인'}
              disabled={confirmPhoneCode.isPending || !verification.phoneId || phoneExpiresIn <= 0}
              onClick={handleConfirmPhoneCode}
              secondButtonLabel="재전송"
              secondDisabled={sendPhoneCode.isPending || phoneResendIn > 0}
              onSecondClick={handleSendPhoneCode}
            />
            <StatusPill active={Boolean(verification.phoneToken)}>휴대폰 인증이 완료되었습니다.</StatusPill>
            {fieldErrors.phoneCode && <p className="cw-register-error">{fieldErrors.phoneCode}</p>}
          </Field>
          <Field label="비밀번호" required wide>
            <PasswordInput
              value={form.password}
              onChange={(value) => update('password', value)}
              placeholder="비밀번호(8~16자의 영문, 숫자, 특수기호)"
            />
            {fieldErrors.password && <p className="cw-register-error">{fieldErrors.password}</p>}
          </Field>
          <Field label="비밀번호 확인" required wide>
            <PasswordInput value={form.passwordConfirm} onChange={(value) => update('passwordConfirm', value)} placeholder="비밀번호 재입력" />
            {passwordMismatch && <p className="cw-register-error">비밀번호가 일치하지 않습니다.</p>}
            {fieldErrors.passwordConfirm && <p className="cw-register-error">{fieldErrors.passwordConfirm}</p>}
          </Field>
        </div>
      </section>

      <section className="cw-register-section">
        <div className="cw-register-section__title">
          <BadgeCheck size={22} />
          <div>
            <h2>약관 동의</h2>
            <p>필수 약관에 동의하면 가입을 완료할 수 있습니다.</p>
          </div>
        </div>
        <PersonalTerms termDetails={termDetails} values={terms} onChange={setTerms} />
        {fieldErrors.terms && <p className="cw-register-error">{fieldErrors.terms}</p>}
      </section>

      {formMessage && <p className="cw-register-error">{formMessage}</p>}
      {successMessage && <StatusPill active>{successMessage}</StatusPill>}

      <button className="cw-register-submit" disabled={registerUser.isPending} type="submit">
        {registerUser.isPending ? '가입 처리 중' : '가입하기'}
      </button>
    </form>
  );
}

function PersonalTerms({ values, onChange, termDetails }: PersonalTermsProps) {
  const [openDetails, setOpenDetails] = useState<Partial<Record<PersonalTermKey, boolean>>>({});
  const allChecked = values.age && values.service && values.privacy && values.marketing;

  const toggleAll = (checked: boolean) => {
    onChange({
      age: checked,
      service: checked,
      privacy: checked,
      marketing: checked,
    });
  };

  const toggleOne = (key: PersonalTermKey) => {
    onChange({
      ...values,
      [key]: !values[key],
    });
  };

  const toggleDetail = (key: PersonalTermKey) => {
    setOpenDetails((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const terms: Array<{
    key: PersonalTermKey;
    type: 'required' | 'optional';
    label: string;
    details?: TermSection[];
  }> = [
    { key: 'age', type: 'required', label: '만 15세 이상입니다' },
    { key: 'service', type: 'required', label: '이용약관 동의', details: termDetails.service },
    { key: 'privacy', type: 'required', label: '개인정보 수집 및 이용 동의', details: termDetails.privacy },
    { key: 'marketing', type: 'optional', label: '광고성 정보 수신 동의', details: termDetails.marketing },
  ];

  return (
    <div className="cw-register-terms cw-register-terms--detail">
      <label className="cw-register-check cw-register-check--all">
        <input type="checkbox" checked={allChecked} onChange={(event) => toggleAll(event.target.checked)} />
        <span>전체 동의</span>
      </label>

      {terms.map((term) => (
        <div className="cw-register-term-row" key={term.key}>
          <div className="cw-register-term-line">
            <span className="cw-register-term-name">
              <strong className={`cw-register-term-type cw-register-term-type--${term.type}`}>
                {term.type === 'required' ? '[필수]' : '[선택]'}
              </strong>
              {term.label}
            </span>
            <div className="cw-register-term-actions">
              {term.details && (
                <button
                  className={`cw-register-detail-button ${openDetails[term.key] ? 'is-open' : ''}`}
                  type="button"
                  onClick={() => toggleDetail(term.key)}
                >
                  내용보기
                </button>
              )}
              <input
                aria-label={term.label}
                type="checkbox"
                checked={values[term.key]}
                onChange={() => toggleOne(term.key)}
              />
            </div>
          </div>
          {term.details && openDetails[term.key] && (
            <div className="cw-register-term-detail">
              {term.details.map((section: TermSection) => (
                <section key={section.title}>
                  <h3>{section.title}</h3>
                  {section.body.split('\n').map((line: string, index: number) => (
                    <p key={`${section.title}-${index}`}>{line || '\u00a0'}</p>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
