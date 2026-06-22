import { LoginForm } from '../../../components/user/member/LoginForm';
import { LoginPageLinks } from '../../../components/user/member/LoginPageLinks';
import { LoginTypeTabs } from '../../../components/user/member/LoginTypeTabs';
import { useLoginForm } from '../../../hooks/user/member';
import { SOCIAL_PROVIDERS } from '../../../utils/user/member/socialAuth';
import { memberSocialAuthApi } from '../../../api/user/member/socialAuthApi';
import '@/styles/user/auth/AuthPage.css';

function LoginPage() {
  const {
    blockedDecision,
    blockedMessage,
    credentials,
    fieldErrors,
    handleSubmit,
    isSubmitting,
    loginType,
    updateCredential,
    updateLoginType,
  } = useLoginForm();

  return (
    <section className="cw-auth-page">
      <div className="cw-auth-card cw-auth-card--login">
        <p className="cw-auth-eyebrow">LOGIN</p>
        <h1>로그인</h1>
        <p>개인회원 또는 기업회원으로 로그인하고 커리어 웨이브 서비스를 이어서 이용하세요.</p>

        <LoginTypeTabs value={loginType} onChange={updateLoginType} />
        <LoginForm
          blockedDecision={blockedDecision}
          blockedMessage={blockedMessage}
          credentials={credentials}
          fieldErrors={fieldErrors}
          isSubmitting={isSubmitting}
          onCredentialChange={updateCredential}
          onSubmit={handleSubmit}
        />
        <div className="cw-auth-social">
          <p className="cw-auth-social__label">소셜 계정으로 로그인</p>
          <div className="cw-social-login" aria-label="소셜 로그인">
            {SOCIAL_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                aria-label={`${provider.label} 로그인`}
                className={`cw-social-login__button cw-social-login__${provider.id}`}
                type="button"
                onClick={() => {
                  void memberSocialAuthApi
                    .authorize(provider.id)
                    .then(({ authorizationUrl }) => { window.location.href = authorizationUrl; })
                    .catch(() => { alert(`${provider.label} 로그인을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.`); });
                }}
              >
                {provider.mark}
              </button>
            ))}
          </div>
        </div>
        <LoginPageLinks />
      </div>
    </section>
  );
}

export default LoginPage;
