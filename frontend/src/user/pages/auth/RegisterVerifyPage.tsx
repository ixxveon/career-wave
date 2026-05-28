import { useState } from 'react';
import { CheckCircle2, ShieldCheck, UserRound } from 'lucide-react';
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

function RegisterVerifyPage() {
  const [form, setForm] = useState(initialForm);
  const [terms, setTerms] = useState(initialTerms);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const canSubmit = terms.service && terms.privacy;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const allTermsChecked = terms.service && terms.privacy && terms.marketing;

  const toggleAll = (checked) => {
    setTerms({
      service: checked,
      privacy: checked,
      marketing: checked,
    });
  };

  const toggleTerm = (key) => {
    setTerms((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <section className="cw-auth-page cw-register-page">
      <div className="cw-register-shell cw-register-shell--narrow">
        <div className="cw-register-hero">
          <p className="cw-auth-eyebrow">SOCIAL SIGN UP</p>
          <h1>추가 정보 입력</h1>
          <p>Career Wave 이용을 위해 소셜 계정에 필요한 정보를 조금만 더 입력해주세요.</p>
        </div>

        <form className="cw-register-form">
          <section className="cw-register-section">
            <div className="cw-register-section__title">
              <ShieldCheck size={22} />
              <div>
                <h2>소셜 계정 정보</h2>
                <p>실제 소셜 연동 후에는 provider와 이메일 값이 자동으로 표시됩니다.</p>
              </div>
            </div>
            <div className="cw-register-social-summary">
              <span>가입 방식</span>
              <strong>소셜 계정</strong>
              <span>이메일</span>
              <strong>social.user@careerwave.com</strong>
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
                  <button className="cw-register-sub-button" type="button" onClick={() => alert('휴대폰 인증번호 전송 API 연결 예정')}>
                    인증번호 전송
                  </button>
                </div>
              </label>
              <label className="cw-register-field cw-register-field--wide">
                <span className="cw-register-label">휴대폰 인증번호</span>
                <div className="cw-register-inline">
                  <input value={form.phoneCode} onChange={(event) => update('phoneCode', event.target.value)} placeholder="인증번호 입력" />
                  <button className="cw-register-sub-button" type="button" onClick={() => setPhoneVerified(true)}>
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

          <button className="cw-register-submit" disabled={!canSubmit} type="button">
            가입 완료
          </button>
        </form>
      </div>
    </section>
  );
}

export default RegisterVerifyPage;
