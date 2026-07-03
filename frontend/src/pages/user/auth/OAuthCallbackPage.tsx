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

// 백엔드가 서브도메인 배포 환경에서 handoff 쿠키를 Domain=.careerwave.kr(host-only 아님)로
// 설정하므로, 만료 시에도 동일 Domain을 지정해야 domain-scoped 쿠키가 삭제된다.
// VITE_COOKIE_DOMAIN 미설정(로컬)이면 host-only 쿠키만 만료.
const COOKIE_DOMAIN = import.meta.env.VITE_COOKIE_DOMAIN as string | undefined;

function clearHandoffCookie(name: string) {
  // host-only 쿠키 만료 (로컬)
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Strict`;
  // domain-scoped 쿠키 만료 (서브도메인 배포)
  if (COOKIE_DOMAIN) {
    document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${COOKIE_DOMAIN}; SameSite=Strict`;
  }
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
        // 즉시 rotate하여 이후 요청과 동일한 조건의 쿠키로 교체한다.
        // 회전이 끝나기 전에 navigate하면 이후 페이지의 요청/ProtectedRoute가 구 refresh
        // 쿠키로 refresh를 재발사해 백엔드 재사용 탐지에 걸려 세션 전체가 폐기된다.
        // 따라서 회전 완료(성공/실패 무관)를 기다린 뒤 이동해 경쟁 창을 닫는다. (이슈 #1025)
        probeAuth()
          .catch(() => {})
          .finally(() => navigate('/', { replace: true }));
      } else {
        navigate('/', { replace: true });
      }
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
