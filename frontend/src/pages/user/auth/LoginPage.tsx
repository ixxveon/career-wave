import { LoginForm } from '../../../components/user/member/LoginForm';
import { LoginPageLinks } from '../../../components/user/member/LoginPageLinks';
import { LoginTypeTabs } from '../../../components/user/member/LoginTypeTabs';
import { useLoginForm } from '../../../hooks/user/member';
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
        <LoginPageLinks />
      </div>
    </section>
  );
}

export default LoginPage;
