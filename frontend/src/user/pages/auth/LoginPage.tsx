import { Link, useNavigate } from 'react-router-dom';
import { type FormEvent, useState } from 'react';
import { AlertCircle, Apple, LockKeyhole, UserRound } from 'lucide-react';
import { getLoginRouteDecision, useLogin } from '../../hooks/member';
import type { LoginRouteDecision } from '../../types/member';
import { authSession } from '../../utils/member/authSession';
import { getSafeLoginMessage, type MemberApiError } from '../../utils/member/errorMapping';
import {
  hasLoginFormErrors,
  toLoginRequest,
  validateLoginForm,
  type LoginFormErrors,
  type LoginTab,
} from '../../utils/member/loginSchema';
import './AuthPage.css';

type CredentialKey = 'loginId' | 'password';

interface Credentials {
  loginId: string;
  password: string;
}

interface SocialProvider {
  id: 'kakao' | 'naver' | 'google' | 'apple';
  label: string;
  mark?: string;
}

const socialProviders: SocialProvider[] = [
  { id: 'kakao', label: '카카오', mark: 'K' },
  { id: 'naver', label: '네이버', mark: 'N' },
  { id: 'google', label: 'Google', mark: 'G' },
  { id: 'apple', label: 'Apple' },
];

const blockMessageByReason: Record<Extract<LoginRouteDecision, { type: 'BLOCK' }>['reason'], { title: string; description: string; actionLabel: string; actionPath: string }> = {
  COMPANY_PENDING: {
    title: '기업회원 승인 검토 중입니다.',
    description: '제출하신 기업정보와 재직증명서를 확인하고 있습니다. 승인 완료 후 기업 서비스를 이용할 수 있습니다.',
    actionLabel: '고객센터로 이동',
    actionPath: '/support',
  },
  COMPANY_REJECTED: {
    title: '기업회원 가입 승인이 반려되었습니다.',
    description: '상세한 반려 사유와 재신청 가능 여부는 고객센터를 통해 확인해주세요.',
    actionLabel: '고객센터로 이동',
    actionPath: '/support',
  },
  COMPANY_NEEDS_REVISION: {
    title: '기업회원 정보 보완이 필요합니다.',
    description: '기업정보 또는 제출 서류 보완 후 다시 검토를 요청해주세요.',
    actionLabel: '고객센터로 이동',
    actionPath: '/support',
  },
  RESTRICTED: {
    title: '현재 계정으로 서비스를 이용할 수 없습니다.',
    description: '계정 보안 또는 이용 제한 상태입니다. 상세 내부 사유는 노출되지 않으며 복구 가능 여부는 고객센터에서 확인해주세요.',
    actionLabel: '고객센터로 이동',
    actionPath: '/support',
  },
};

function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLogin();
  const [loginType, setLoginType] = useState<LoginTab>('personal');
  const [credentials, setCredentials] = useState<Credentials>({
    loginId: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<LoginFormErrors>({});
  const [blockedDecision, setBlockedDecision] = useState<Extract<LoginRouteDecision, { type: 'BLOCK' }> | null>(null);

  const isSubmitting = loginMutation.isPending;

  const updateCredential = (key: CredentialKey, value: string) => {
    setCredentials((current) => ({
      ...current,
      [key]: value,
    }));
    setFieldErrors((current) => ({ ...current, [key]: undefined, form: undefined }));
    setBlockedDecision(null);
  };

  const updateLoginType = (type: LoginTab) => {
    setLoginType(type);
    setFieldErrors({});
    setBlockedDecision(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateLoginForm(credentials);
    setFieldErrors(nextErrors);
    setBlockedDecision(null);

    if (hasLoginFormErrors(nextErrors)) return;

    try {
      const response = await loginMutation.mutateAsync(toLoginRequest(credentials, loginType));
      const decision = getLoginRouteDecision(response);

      if (decision.type === 'BLOCK') {
        authSession.clear();
        setBlockedDecision(decision);
        return;
      }

      authSession.setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      authSession.setMember(response.member);
      navigate(decision.path, { replace: true });
    } catch (error) {
      setFieldErrors({
        form: getSafeLoginMessage(error as MemberApiError),
      });
    }
  };

  const blockMessage = blockedDecision ? blockMessageByReason[blockedDecision.reason] : null;

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
            onClick={() => updateLoginType('personal')}
            role="tab"
            type="button"
          >
            개인 로그인
          </button>
          <button
            aria-selected={loginType === 'company'}
            className={loginType === 'company' ? 'is-active' : ''}
            onClick={() => updateLoginType('company')}
            role="tab"
            type="button"
          >
            기업 로그인
          </button>
        </div>

        <form className="cw-auth-form" onSubmit={handleSubmit} noValidate>
          <label>
            아이디
            <span>
              <UserRound size={18} />
              <input
                aria-invalid={Boolean(fieldErrors.loginId)}
                aria-describedby={fieldErrors.loginId ? 'login-id-error' : undefined}
                type="text"
                placeholder="아이디를 입력하세요"
                value={credentials.loginId}
                onChange={(event) => updateCredential('loginId', event.target.value)}
              />
            </span>
            {fieldErrors.loginId && (
              <p className="cw-register-error" id="login-id-error">
                {fieldErrors.loginId}
              </p>
            )}
          </label>
          <label>
            비밀번호
            <span>
              <LockKeyhole size={18} />
              <input
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={credentials.password}
                onChange={(event) => updateCredential('password', event.target.value)}
              />
            </span>
            {fieldErrors.password && (
              <p className="cw-register-error" id="login-password-error">
                {fieldErrors.password}
              </p>
            )}
          </label>
          {fieldErrors.form && (
            <p className="cw-auth-message cw-auth-message--error" role="alert">
              <AlertCircle size={16} />
              {fieldErrors.form}
            </p>
          )}
          {blockMessage && (
            <div className="cw-auth-blocked" role="status" aria-live="polite">
              <div>
                <AlertCircle size={18} />
                <strong>{blockMessage.title}</strong>
              </div>
              <p>{blockMessage.description}</p>
              <Link to={blockMessage.actionPath}>{blockMessage.actionLabel}</Link>
            </div>
          )}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '로그인 중' : '로그인'}
          </button>
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
          <Link to="/auth/find-account">아이디 찾기</Link>
          <span aria-hidden="true">|</span>
          <Link to="/auth/find-account">비밀번호 찾기</Link>
          <span aria-hidden="true">|</span>
          <Link to="/auth/register">회원가입</Link>
        </div>
      </div>
    </section>
  );
}

export default LoginPage;
