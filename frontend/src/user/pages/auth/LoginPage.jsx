import { useState } from 'react';
import { Apple, LockKeyhole, UserRound } from 'lucide-react';
import './AuthPage.css';

const socialProviders = [
  { id: 'kakao', label: '카카오', mark: 'K' },
  { id: 'naver', label: '네이버', mark: 'N' },
  { id: 'google', label: 'Google', mark: 'G' },
  { id: 'apple', label: 'Apple', mark: null },
];

function LoginPage() {
  const [loginType, setLoginType] = useState('personal');
  const [credentials, setCredentials] = useState({
    loginId: '',
    password: '',
  });

  const updateCredential = (key, value) => {
    setCredentials((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <section className="cw-auth-page">
      <div className="cw-auth-card cw-auth-card--login">
        <p className="cw-auth-eyebrow">LOGIN</p>
        <h1>로그인</h1>
        <p>개인회원 또는 기업회원으로 로그인하고 커리어 웨이브 서비스를 이어서 이용하세요.</p>

        <div className="cw-register-tabs cw-register-tabs--auth" role="tablist" aria-label="로그인 유형">
          <button
            aria-selected={loginType === 'personal'}
            className={loginType === 'personal' ? 'is-active' : ''}
            onClick={() => setLoginType('personal')}
            role="tab"
            type="button"
          >
            개인 로그인
          </button>
          <button
            aria-selected={loginType === 'company'}
            className={loginType === 'company' ? 'is-active' : ''}
            onClick={() => setLoginType('company')}
            role="tab"
            type="button"
          >
            기업 로그인
          </button>
        </div>

        <form className="cw-auth-form">
          <label>
            아이디
            <span>
              <UserRound size={18} />
              <input
                type="text"
                placeholder="아이디를 입력하세요"
                value={credentials.loginId}
                onChange={(event) => updateCredential('loginId', event.target.value)}
              />
            </span>
          </label>
          <label>
            비밀번호
            <span>
              <LockKeyhole size={18} />
              <input
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={credentials.password}
                onChange={(event) => updateCredential('password', event.target.value)}
              />
            </span>
          </label>
          <button type="button">로그인</button>
        </form>

        <div className="cw-auth-divider">소셜 계정으로 간편 로그인</div>

        <div className="cw-social-login" aria-label="소셜 로그인">
          {socialProviders.map((provider) => (
            <button
              aria-label={`${provider.label} 로그인`}
              className={`cw-social-login__button cw-social-login__${provider.id}`}
              type="button"
              key={provider.id}
            >
              {provider.id === 'apple' ? <Apple size={24} /> : provider.mark}
            </button>
          ))}
        </div>

        <div className="cw-auth-links">
          <a href="#">아이디 찾기</a>
          <span aria-hidden="true">|</span>
          <a href="#">비밀번호 찾기</a>
          <span aria-hidden="true">|</span>
          <a href="/auth/register">회원가입</a>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
