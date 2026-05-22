import { useState } from 'react';
import { Apple } from 'lucide-react';
import './AuthPage.css';

const socialProviders = [
  { id: 'kakao', label: '카카오', mark: 'K' },
  { id: 'naver', label: '네이버', mark: 'N' },
  { id: 'google', label: 'Google', mark: 'G' },
  { id: 'apple', label: 'Apple', mark: null },
];

function RegisterPage() {
  const [registerType, setRegisterType] = useState('personal');
  const verificationPath = `/auth/register/verify?type=${registerType}`;

  return (
    <section className="cw-auth-page cw-auth-page--simple">
      <div className="cw-auth-choice">
        <div className="cw-auth-choice__tabs" role="tablist" aria-label="회원가입 유형">
          <button
            aria-selected={registerType === 'personal'}
            className={registerType === 'personal' ? 'is-active' : ''}
            onClick={() => setRegisterType('personal')}
            role="tab"
            type="button"
          >
            개인회원
          </button>
          <button
            aria-selected={registerType === 'company'}
            className={registerType === 'company' ? 'is-active' : ''}
            onClick={() => setRegisterType('company')}
            role="tab"
            type="button"
          >
            기업회원
          </button>
        </div>

        <div className="cw-auth-divider">소셜 계정으로 간편 로그인</div>

        <div className="cw-social-login" aria-label="소셜 회원가입">
          {socialProviders.map((provider) => (
            <button
              aria-label={`${provider.label} 회원가입`}
              className={`cw-social-login__button cw-social-login__${provider.id}`}
              type="button"
              key={provider.id}
            >
              {provider.id === 'apple' ? <Apple size={26} /> : provider.mark}
            </button>
          ))}
        </div>

        <a className="cw-auth-primary-link" href={verificationPath}>
          Career Wave 통합 아이디 만들기
        </a>

        <p className="cw-auth-bottom-text">
          이미 계정이 있나요? <a href="/auth/login">로그인</a>
        </p>
      </div>
    </section>
  );
}

export default RegisterPage;
