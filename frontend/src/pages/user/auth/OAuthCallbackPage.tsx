import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authSession } from '../../../utils/user/member/authSession';
import { probeAuth } from '../../../api/user/member/memberApiClient';
import { SOCIAL_SIGNUP_TOKEN_SESSION_KEY } from './RegisterVerifyPage';

const OAUTH_TYPE = {
  LOGIN: 'login',
  SIGNUP: 'signup',
} as const;

function getHandoffCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function clearHandoffCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Strict`;
}

function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const type = searchParams.get('type');

    if (type === OAUTH_TYPE.LOGIN) {
      const accessToken = getHandoffCookie('cw_oauth_login_token');
      clearHandoffCookie('cw_oauth_login_token');
      if (accessToken) {
        authSession.setTokens({ accessToken });
        // OAuth 콜백(백엔드) 응답에서 설정된 refresh 쿠키를 프론트가 사용하는 API 경로로
        // 즉시 rotate하여 이후 요청과 동일한 조건의 쿠키로 교체한다. (실패해도 무시)
        probeAuth().catch(() => {});
      }
      navigate('/', { replace: true });
    } else if (type === OAUTH_TYPE.SIGNUP) {
      const token = getHandoffCookie('cw_oauth_signup_token');
      clearHandoffCookie('cw_oauth_signup_token');
      const provider = searchParams.get('provider');
      const email = searchParams.get('email');

      if (token) {
        sessionStorage.setItem(SOCIAL_SIGNUP_TOKEN_SESSION_KEY, token);
      } else {
        sessionStorage.removeItem(SOCIAL_SIGNUP_TOKEN_SESSION_KEY);
      }

      const params = new URLSearchParams();
      if (provider) params.set('provider', provider);
      if (email) params.set('email', email);
      navigate(`/auth/register/verify?${params.toString()}`, { replace: true });
    } else {
      navigate('/auth/login', { replace: true });
    }
  }, []);

  return <p style={{ textAlign: 'center', marginTop: '4rem' }}>소셜 로그인 처리 중...</p>;
}

export default OAuthCallbackPage;
