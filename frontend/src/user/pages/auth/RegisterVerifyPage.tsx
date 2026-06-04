import { useState, type FormEvent } from 'react';
import { CheckCircle2, ShieldCheck, UserRound } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getSocialProviderLabel } from '../../utils/member/socialAuth';
import './AuthPage.css';

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
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(initialForm);
  const [terms, setTerms] = useState(initialTerms);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [verificationRequested, setVerificationRequested] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const normalizedPhone = form.phone.replace(/\D/g, '');
  const canSubmit =
    form.name.trim().length > 0 &&
    form.carrier.trim().length > 0 &&
    normalizedPhone.length >= 10 &&
    form.phoneCode.trim().length > 0 &&
    phoneVerified &&
    terms.service &&
    terms.privacy;
  const provider = getSocialProviderLabel(searchParams.get('provider'));
  const socialEmail = searchParams.get('email');

  const update = (key: RegisterVerifyFormKey, value: RegisterVerifyForm[RegisterVerifyFormKey]) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'phone' ? { phoneCode: '' } : {}),
    }));
    setFormMessage('');
    setSuccessMessage('');

    if (key === 'phone') {
      setPhoneVerified(false);
      setVerificationRequested(false);
    }

    if (key === 'phoneCode') {
      setPhoneVerified(false);
    }
  };
  const allTermsChecked = terms.service && terms.privacy && terms.marketing;

  const toggleAll = (checked: boolean) => {
    setTerms({
      service: checked,
      privacy: checked,
      marketing: checked,
    });
  };

  const toggleTerm = (key: RegisterVerifyTermKey) => {
    setTerms((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleSendPhoneCode = () => {
    if (normalizedPhone.length < 10) {
      setFormMessage('휴대폰 번호를 먼저 입력해주세요.');
      return;
    }

    setVerificationRequested(true);
    setPhoneVerified(false);
    setFormMessage('');
    setSuccessMessage('인증번호를 입력한 뒤 인증 확인을 진행해주세요.');
  };

  const handleConfirmPhoneCode = () => {
    if (!verificationRequested) {
      setFormMessage('먼저 인증번호를 전송해주세요.');
      return;
    }

    if (!form.phoneCode.trim()) {
      setFormMessage('인증번호를 입력해주세요.');
      return;
    }

    setPhoneVerified(true);
    setFormMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      setFormMessage('필수 정보와 휴대폰 인증 완료 여부를 확인해주세요.');
      return;
    }

    setFormMessage('');
    setSuccessMessage('소셜 가입 추가 정보 입력이 완료되었습니다.');
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
              {socialEmail && (
                <>
                  <span>이메일</span>
                  <strong>{socialEmail}</strong>
                </>
              )}
            </div>
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
              </label>
              <label className="cw-register-field cw-register-field--wide">
                <span className="cw-register-label">
                  휴대폰 번호 <em>*</em>
                </span>
                <div className="cw-register-inline">
                  <input value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="010-0000-0000" />
                  <button className="cw-register-sub-button" type="button" onClick={handleSendPhoneCode}>
                    인증번호 전송
                  </button>
                </div>
              </label>
              <label className="cw-register-field cw-register-field--wide">
                <span className="cw-register-label">휴대폰 인증번호</span>
                <div className="cw-register-inline">
                  <input value={form.phoneCode} onChange={(event) => update('phoneCode', event.target.value)} placeholder="인증번호 입력" />
                  <button className="cw-register-sub-button" type="button" onClick={handleConfirmPhoneCode}>
                    인증 확인
                  </button>
                </div>
                {phoneVerified && (
                  <span className="cw-register-status">
                    <CheckCircle2 size={15} />
                    휴대폰 인증 완료
                  </span>
                )}
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
          </section>

          {formMessage && <p className="cw-register-error">{formMessage}</p>}
          {successMessage && (
            <span className="cw-register-status">
              <CheckCircle2 size={15} />
              {successMessage}
            </span>
          )}

          <button className="cw-register-submit" disabled={!canSubmit} type="submit">
            가입 완료
          </button>
        </form>
      </div>
    </section>
  );
}

export default RegisterVerifyPage;
