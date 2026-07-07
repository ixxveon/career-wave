import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authSession } from '../../../utils/user/member/authSession';
import { probeAuth } from '../../../api/user/member/memberApiClient';
import { setLastLoginMethod } from '../../../utils/user/member/lastLoginMethod';
import { SOCIAL_PROVIDER_LABELS, type SocialProviderId } from '../../../utils/user/member/socialAuth';
import { SOCIAL_SIGNUP_TOKEN_SESSION_KEY } from './RegisterVerifyPage';

const OAUTH_TYPE = {
  LOGIN: 'login',
  SIGNUP: 'signup',
} as const;

// probeAuth(refresh 회전)가 서버 무응답으로 영원히 pending되면 콜백 화면에서 무한 대기하게
// 되므로, 타임아웃을 걸어 회전 완료 또는 일정 시간 경과 중 먼저 도달하는 시점에 이동한다.
const PROBE_TIMEOUT_MS = 5000;

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
        // 마지막 로그인 방식 기록 — 다음 방문 시 소셜 로그인 안내에 사용
        const provider = searchParams.get('provider');
        if (provider && provider in SOCIAL_PROVIDER_LABELS) {
          setLastLoginMethod(provider as SocialProviderId);
        }
        // OAuth 콜백(백엔드) 응답에서 설정된 refresh 쿠키를 프론트가 사용하는 API 경로로
        // 즉시 rotate하여 이후 요청과 동일한 조건의 쿠키로 교체한다.
        // 회전이 끝나기 전에 navigate하면 이후 페이지의 요청/ProtectedRoute가 구 refresh
        // 쿠키로 refresh를 재발사해 백엔드 재사용 탐지에 걸려 세션 전체가 폐기된다.
        // 따라서 회전 완료(성공/실패 무관)를 기다린 뒤 이동해 경쟁 창을 닫는다. (이슈 #1025)
        const rotation = probeAuth().catch(() => {});
        const timeout = new Promise<void>((resolve) => setTimeout(resolve, PROBE_TIMEOUT_MS));
        Promise.race([rotation, timeout]).finally(() => navigate('/', { replace: true }));
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
